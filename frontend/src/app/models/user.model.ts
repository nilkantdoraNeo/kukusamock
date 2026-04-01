export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  phone?: string;
  age?: number;
  avatar_url?: string;
  score: number;
  rank: number;
  status?: string;
  is_admin?: boolean;
}
