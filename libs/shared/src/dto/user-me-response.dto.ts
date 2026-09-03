export class UserMeResponseDto {
  id: string;
  email: string;
  displayName: string;
  bio?: string;
  status: string;
  roles: string[];
  createdAt: string;
}
