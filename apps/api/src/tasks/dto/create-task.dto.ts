import {
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title!: string;

  @IsNumber()
  @Min(0.01)
  @Max(24)
  estimatedHours!: number;

  @IsOptional()
  @IsUrl()
  @MaxLength(2000)
  sourceLink?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  reportDate!: string;

  @IsUUID()
  teamId!: string;
}
