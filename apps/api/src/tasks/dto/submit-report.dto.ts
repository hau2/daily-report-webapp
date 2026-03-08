import { IsOptional, IsIn } from 'class-validator';

export class SubmitReportDto {
  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  stressLevel?: 'low' | 'medium' | 'high';
}
