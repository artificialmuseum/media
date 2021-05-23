#!/usr/bin/env node

import child_process from 'child_process'
import path from 'path'

import fs from '@magic/fs'


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

    const webmPath = `${dir}/${fileName}.webm`
    const webmExists = fs.existsSync(webmPath)

    if (webmExists) {
      return
    }


    const args = [
      '-i', `${dir}/${fileName}${srcExt}`,
      '-c:v', 'libvpx',
      '-crf', '50',
      '-b:v', '1M',
      '-c:a', 'libvorbis',
    ].join(' ')

    const output = `./docs/video/${fileName}/${fileName}.webm`

    log('Converting', output)
    child_process.execSync(`${cmd} ${args} ${output}`)
    log.success('done')
  })
}

fn()
