#!/usr/bin/env node

import path from 'path'
import fs from '@magic/fs'
import log from '@magic/log'
import child_process from 'child_process'

import { findClosest } from './lib/findClosest.js'

const fn = async () => {
  const cwd = process.cwd()
  const audioDir = path.join(cwd, 'docs', 'audio')
  const files = await fs.getFiles(audioDir)

  const srcExt = '.mp4'

  files.forEach(file => {
    const ext = path.extname(file)
    if (ext !== srcExt) {
      return
    }

    const mediainfo = child_process.execSync(`mediainfo --Output=JSON ${file}`)
    const parsedInfo = JSON.parse(mediainfo)

    const { BitRate, SamplingRate } = parsedInfo.media.track[1]
    const bitrate = findClosest(BitRate / 1000, [64, 128, 160, 192])
    const samplingRate = findClosest(SamplingRate, [44100, 48000])

    const cmd = 'ffmpeg -hide_banner -loglevel error'

    const mp3Name = file.replace(srcExt, '.mp3')
    const mp3Exists = fs.existsSync(mp3Name)
    if (!mp3Exists) {
      log.info('Converting', mp3Name)
      const output = `./docs/audio/${path.basename(mp3Name)}`
      const args = `-i ${file} -acodec libmp3lame -ar ${samplingRate} -ac 2 -ab ${bitrate}k`
      // run sync to make sure only one file converts at a time
      const c = `${cmd} ${args} ${output}`
      child_process.execSync(c)
      log.success('done')
    }

    const oggName = file.replace(srcExt, '.ogg')
    const oggExists = fs.existsSync(oggName)
    if (!oggExists) {
      log.info('Converting', oggName)
      const output = `./docs/audio/${path.basename(oggName)}`
      const args = `-i ${file} -vn -c:a libvorbis -b:a ${bitrate}k -ar ${samplingRate}`
      // run sync to make sure only one file converts at a time
      const c = `${cmd} ${args} ${output}`
      child_process.execSync(c)
      log.success('done')
    }
  })
}

fn()
