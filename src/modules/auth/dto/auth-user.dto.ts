export class AuthUserDto {
  id: string;
  email: string;
  name: string;
  nickname: string;
  profile_url?: string;
  auth_provider: string;
}
