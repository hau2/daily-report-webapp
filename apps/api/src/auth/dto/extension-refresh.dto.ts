import { IsString, IsNotEmpty } from 'class-validator';

export class ExtensionRefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
