export class SpotifyAuthDto {
  spotifyId: string;
  email: string;
  displayName: string;
  profileImageUrl?: string | null;
  followersCount?: number;
}
