import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  IsUrl,
} from 'class-validator';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(24)
  estimatedHours?: number;

  @IsOptional()
  @ValidateIf((_o, value) => value !== '')
  @IsUrl()
  @MaxLength(2000)
  sourceLink?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
