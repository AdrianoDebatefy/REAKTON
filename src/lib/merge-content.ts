import type { Song, World, SiteContent } from "@/types/content";
import { resolveSongVideoUrl } from "@/lib/youtube-url";
import { defaultClubRobotConfig } from "@/lib/club-robot";

function isPlaceholderCover(url?: string): boolean {
  return !url || url.includes("placeholder");
}

function mergeSong(server: Song, client: Song): Song {
  return {
    ...server,
    ...client,
    coverImage:
      isPlaceholderCover(client.coverImage) && !isPlaceholderCover(server.coverImage)
        ? server.coverImage
        : client.coverImage,
    videoSnippet: client.videoSnippet || server.videoSnippet,
    audioSnippet: client.audioSnippet || server.audioSnippet,
    videoUrl: resolveSongVideoUrl(client.videoUrl),
    infoText: client.infoText?.de?.trim() ? client.infoText : server.infoText ?? client.infoText,
    title: client.title || server.title,
  };
}

function mergeSongs(serverSongs: Song[], clientSongs: Song[]): Song[] {
  const serverById = new Map(serverSongs.map((song) => [song.id, song]));
  const length = Math.max(serverSongs.length, clientSongs.length);
  const merged: Song[] = [];

  for (let index = 0; index < length; index++) {
    const clientSong = clientSongs[index];
    const serverSong = serverSongs[index];

    if (!clientSong) {
      if (serverSong) merged.push(serverSong);
      continue;
    }
    if (!serverSong) {
      merged.push(clientSong);
      continue;
    }

    if (clientSong.id === serverSong.id) {
      merged.push(mergeSong(serverSong, clientSong));
      continue;
    }

    const matchedServerSong = serverById.get(clientSong.id);
    merged.push(matchedServerSong ? mergeSong(matchedServerSong, clientSong) : clientSong);
  }

  return merged;
}

/** Prevent a stale admin tab from wiping uploads another save already wrote. */
export function mergeSiteContent(server: SiteContent, client: SiteContent): SiteContent {
  const serverWorlds = new Map(server.worlds.map((world) => [world.id, world]));

  return {
    ...server,
    ...client,
    clubRobot: client.clubRobot
      ? {
          ...defaultClubRobotConfig(),
          ...server.clubRobot,
          ...client.clubRobot,
          tuning: {
            ...defaultClubRobotConfig().tuning,
            ...server.clubRobot?.tuning,
            ...client.clubRobot.tuning,
          },
        }
      : server.clubRobot ?? client.clubRobot,
    worlds: client.worlds.map((clientWorld) => {
      const serverWorld = serverWorlds.get(clientWorld.id);
      if (!serverWorld) return clientWorld;

      return {
        ...serverWorld,
        ...clientWorld,
        songs: mergeSongs(serverWorld.songs, clientWorld.songs),
      };
    }),
    nfcAlbum: client.nfcAlbum ?? server.nfcAlbum,
  };
}
