import { GetData } from '@/clients/filesystem'
import { GetAuthenticatedYoutubeClient } from '@/clients/google'
import { readFileSync, writeFileSync } from 'fs'
import { youtube_v3 } from 'googleapis'

let youtube: youtube_v3.Youtube
let processedYouTubeDescriptions: string[] = JSON.parse(readFileSync('src/scripts/youtube-descriptions.json', 'utf8'))
let processedYouTubeThumbnails: string[] = JSON.parse(readFileSync('src/scripts/youtube-thumbnails.json', 'utf8'))

async function main() {
  // console.log('Syncing YouTube descriptions..')
  // await syncDescriptions()

  console.log('Syncing YouTube thumbnails..')
  await syncThumbnails()
}

async function syncDescriptions() {
  const speakers = GetData('speakers')
  const sessions = GetData('sessions/devcon-7')

  if (!youtube) youtube = await GetAuthenticatedYoutubeClient()

  for (const session of sessions.filter((s: any) => s.sources_youtubeId && !processedYouTubeDescriptions.includes(s.sources_youtubeId))) {
    console.log('-', session.sourceId, `https://studio.youtube.com/video/${session.sources_youtubeId}/edit`)

    const sessionSpeakers = session.speakers.map((i: any) => speakers.find((s: any) => s.id === i))
    let suffix = ' | Devcon SEA'
    let by = ''
    if (session.speakers.length === 1) {
      const speaker = speakers.find((s: any) => s.id === session.speakers[0])
      if (speaker) {
        by = ` by ${speaker.name}`
      }
    }
    let title = session.title.length > 84 ? `${session.title.slice(0, 84)}...` : session.title
    if (title.length + by.length + suffix.length <= 100) {
      title += by + suffix
    } else {
      title = title + suffix
    }

    const description = getSessionDescription(session, sessionSpeakers)

    try {
      const res = await youtube.videos.update({
        part: ['id', 'snippet'],
        requestBody: {
          id: session.sources_youtubeId,
          snippet: {
            title: `${title}`,
            description: description,
            categoryId: '28',
          },
        },
      })

      if (res.status === 200) processedYouTubeDescriptions.push(session.sources_youtubeId)
    } catch (err: any) {
      console.error(`=> [ERROR] Processing ${session.sourceId}`, err.status, err.errors?.[0]?.message)
      if (err.status === 404) {
        console.log(`Video not found => https://app.devcon.org/schedule/${session.sourceId}`)
        console.log('')
      }
      if (err.status === 400) {
        console.log(title)
        console.log(description)
        console.log('')
      }
    }
  }

  writeFileSync('src/scripts/youtube-descriptions.json', JSON.stringify(processedYouTubeDescriptions, null, 2))
}

async function syncThumbnails() {
  const sessions = GetData('sessions/devcon-7')
  const filtered = sessions.filter((s: any) => s.sources_youtubeId && !processedYouTubeThumbnails.includes(s.sources_youtubeId))

  if (!youtube) youtube = await GetAuthenticatedYoutubeClient()

  for (const session of filtered.slice(0, 105)) {
    console.log('-', session.sourceId, `https://studio.youtube.com/video/${session.sources_youtubeId}/edit`)

    try {
      const imageUrl = `https://devcon-social.netlify.app/av/${session.sourceId}/opengraph-image`
      const response = await fetch(imageUrl)
      const imageBuffer = Buffer.from(await response.arrayBuffer())

      const res = await youtube.thumbnails.set({
        videoId: session.sources_youtubeId,
        media: {
          body: imageBuffer,
        },
      })

      if (res.status === 200) processedYouTubeThumbnails.push(session.sources_youtubeId)
    } catch (err: any) {
      console.error(`=> [ERROR] Processing ${session.sourceId}`, err.status, err.errors?.[0]?.message)
    }
  }
  writeFileSync('src/scripts/youtube-thumbnails.json', JSON.stringify(processedYouTubeThumbnails, null, 2))
}

function getSessionDescription(session: any, speakers: any[]) {
  const tags = [...new Set(session.tags)]
  const description = session.description.replace(/[<>]/g, '')

  return `${description}

Speaker(s): ${speakers.map((i: any) => i.name).join(', ')}
${session.expertise ? `Skill level: ${session.expertise}\n` : ''}Track: ${session.track}
${tags.length > 0 ? `Keywords: ${tags.join(', ')}\n` : ''}
Follow us: https://twitter.com/efdevcon, https://twitter.com/ethereum, https://warpcast.com/devcon
Learn more about devcon: https://www.devcon.org/
Learn more about ethereum: https://ethereum.org/ 

Visit the https://archive.devcon.org/ to gain access to the entire library of Devcon talks with the ease of filtering, playlists, personalized suggestions, decentralized access on Swarm, IPFS and more.

Devcon is the Ethereum conference for developers, researchers, thinkers, and makers. 
Devcon SEA was held in Bangkok, Thailand on Nov 12 - Nov 15, 2024.
Devcon is organized and presented by the Ethereum Foundation. To find out more, please visit https://ethereum.foundation/`
}

main()
  .then(() => {
    console.log('Done')
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
