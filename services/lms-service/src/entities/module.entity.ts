import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { Course } from './course.entity';
import { Lesson } from './lesson.entity';

@ObjectType()
@Entity('modules')
@Index(['courseId', 'order'])
export class Module {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column('uuid')
  courseId: string;

  @Field()
  @Column()
  title: string;

  @Field()
  @Column('text')
  description: string;

  @Field(() => Int)
  @Column()
  order: number;

  @Field(() => Int)
  @Column({ default: 0 })
  duration: number;

  @Field()
  @Column({ default: false })
  isPreview: boolean;

  @Field(() => Course)
  @ManyToOne(() => Course, (course) => course.modules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Field(() => [Lesson], { nullable: true })
  @OneToMany(() => Lesson, (lesson) => lesson.module)
  lessons?: Lesson[];

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
