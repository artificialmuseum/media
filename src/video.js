#!/usr/bin/env node

import child_process from 'child_process'
import path from 'path'

import fs from '@magic/fs'
import log from '@magic/log'


const srcExt = '.mp4'
const cmd = 'ffmpeg'

const getMp4Options = (mp4Path) => {
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

  return mp4Options
}

const createWebm = ({ dir, fileName, mp4Options }) => {
  const webmPath = `${dir}/${fileName}.webm`
  const webmExists = fs.existsSync(webmPath)

  if (webmExists) {
    return
  }

  const videoBitRate = Math.floor(mp4Options.video.BitRate * 0.9)

  const args = [
    '-i', `${dir}/${fileName}${srcExt}`,
    '-c:v', 'libvpx',
    '-b:v', videoBitRate,
  ]

  if (mp4Options.audio) {
    const audioArgs = ['-c:a', 'libvorbis']
    args.push(...audioArgs)
  }

  const output = path.join(dir, `${fileName}.webm`)

  log('Converting', output)
  const ffmpeg = `${cmd} ${args.join(' ')} ${output}`
  log.warn('exec', ffmpeg)
  child_process.execSync(ffmpeg)
  log.success('done')
}

const createOgv = ({ dir, fileName, mp4Options }) => {
  const ogvPath = path.join(dir, `${fileName}.ogv`)
  const ogvExists = fs.existsSync(ogvPath)

  if (ogvExists) {
    return
  }

  const args = [
    '-i', `${dir}/${fileName}${srcExt}`,
    '-codec:v', 'libtheora',
    '-b:v', mp4Options.video.BitRate,
  ]

  if (mp4Options.audio) {
    const audioArgs = ['-c:a', 'libvorbis']
    args.push(...audioArgs)
  }

  const output = path.join(dir, `${fileName}.ogv`)

  log('Converting', output)
  const ffmpeg = `${cmd} ${args.join(' ')} ${output}`
  log.warn('exec', ffmpeg)
  child_process.execSync(ffmpeg)
  log.success('done')
}

const fn = async (videoDir) => {
  const files = await fs.getFiles(videoDir)

  const mp4Files = files.filter(file => file.endsWith('.mp4'))

  await Promise.all(mp4Files.map(async file => {
    const fileName = path.basename(file).replace('.mp4', '')
    const dir = path.dirname(file)

    const mp4Options = getMp4Options(file)

    await createWebm({ dir, fileName, mp4Options })

    /* support is 36%, all browsers that support ogv support webm */
    /* TODO: add av1 video instead */
    // await createOgv({ dir, fileName, mp4Options })
  }))

  const videoFiles = await fs.getFiles(videoDir)

  const results = await Promise.all(videoFiles.map(async video => {
    const stat = await fs.stat(video)

    if (stat.size === 0) {
      log.error('E_EMPTY_FILE', `Empty Video File: ${video}`)
      return false
    }
    return true
  }))

  if (!results.some(a => a === false)) {
    log.success('CONVERTED all video files in', videoDir)
  }
}

const main = async () => {
  const cwd = process.cwd()
  const videoDir = path.join(cwd, 'docs', 'video')
  await fn(videoDir)

  const assetVideoDir = path.join(cwd, 'docs', 'assets', 'video')
  await fn(assetVideoDir)
}

main()
