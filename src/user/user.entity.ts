import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ unique: true })
  nickname: string;

  @CreateDateColumn()
  createdAt: Date;

  // ✅ profileUrl 추가 (선택 사항)
  @Column({ nullable: true, default: '' })
  profileUrl: string;
}
