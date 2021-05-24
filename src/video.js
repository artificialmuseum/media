#!/usr/bin/env node

import child_process from 'child_process'
import path from 'path'

import fs from '@magic/fs'
import log from '@magic/log'

const fn = async () => {
  const cwd = process.cwd()
  const videoDir = path.join(cwd, 'docs', 'video')
  const dirs = await fs.getDirectories(videoDir)

  const srcExt = '.mp4'
  const cmd = 'ffmpeg'

  dirs.map(dir => {
    if (dir === videoDir) {
      return
    }

    const fileName = path.basename(dir)

    const mp4Path = `${dir}/${fileName}.mp4`

    const mp4Info = child_process.execSync(`mediainfo --Output=JSON ${mp4Path}`)
    const parsedInfo = JSON.parse(mp4Info)

    const mp4Options = {}

    parsedInfo.media.track.forEach(asset => {
      if (asset['@type'] === 'Video') {
        const { BitRate, Format, CodecID } = asset

        if (Format !== 'AVC') {
          throw new Error(`MP4 Video Error: Format is expected to be AVC, got ${Format}`)
        }

        if (CodecID !== 'avc1') {
          throw new Error(`MP4 Video Error: CodecID is expected to be avc1, got ${CodecID}`)
        }

        mp4Options.video = {
          BitRate,
        }
      } else if (asset['@type'] === 'Audio') {
        const { BitRate, SamplingRate, Format, CodecID } = asset

        if (Format !== 'AAC') {
          throw new Error(`MP4 Audio Error: Format is expected to be AAC, got ${Format}`)
        }

        if (CodecID !== 'mp4a-40-2') {
          throw new Error(`MP4 Video Error: CodecID is expected to be mp4a-40-2, got ${CodecID}`)
        }

        mp4Options.audio = {
          BitRate,
          SamplingRate,
        }
      }
    })

    const webmPath = `${dir}/${fileName}.webm`
    const webmExists = fs.existsSync(webmPath)

    if (webmExists) {
      return
    }

    // const { BitRate, SamplingRate } = parsedInfo.media.track[1]
    // const bitrate = findClosest(BitRate / 1000, [64, 128, 160, 192])
    // const samplingRate = findClosest(SamplingRate, [44100, 48000])

    // console.log({ BitRate, SamplingRate })

    const videoBitRate = Math.floor(mp4Options.video.BitRate * 0.6)

    const args = [
      '-i', `${dir}/${fileName}${srcExt}`,
      '-c:v', 'libvpx',
      '-b:v', videoBitRate,
    ]

    if (mp4Options.audio) {
      const audioArgs = ['-c:a', 'libvorbis']
      args.push(...audioArgs)
    }

    const output = `./docs/video/${fileName}/${fileName}.webm`

    log('Converting', output)
    const ffmpeg = `${cmd} ${args.join(' ')} ${output}`
    console.warn('exec', ffmpeg)
    child_process.execSync(ffmpeg)
    log.success('done')
  })

  const videoFiles = await fs.getFiles(videoDir)

  await Promise.all(videoFiles.map(async video => {
    const stat = await fs.stat(video)

    if (stat.size === 0) {
      log.error('E_EMPTY_FILE', `Empty Video File: ${video}`)
    }
  }))
}

fn()
