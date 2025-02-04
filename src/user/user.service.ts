import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createUser(
    email: string,
    password: string,
    nickname: string,
    profileUrl: string = '',
  ): Promise<User> {
    console.log('🚩 받은 비밀번호:', password); // 📌 받은 비밀번호 출력

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('🔐 해싱된 비밀번호:', hashedPassword); // 📌 해싱 결과 출력

    const newUser = this.userRepository.create({
      email,
      password: hashedPassword,
      nickname,
      profileUrl,
    });

    return this.userRepository.save(newUser);
  }

  findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }
    return user;
  }
}
