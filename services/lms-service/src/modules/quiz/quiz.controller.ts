import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { QuizService } from './quiz.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizSwaggerDto } from './dto/update-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('quizzes')
@Controller('quizzes')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new quiz' })
  @ApiResponse({ status: 201, description: 'Quiz created successfully' })
  async create(@Body() createQuizDto: CreateQuizDto) {
    return this.quizService.create(createQuizDto);
  }

  @Get('lesson/:lessonId')
  @ApiOperation({ summary: 'Get quiz by lesson ID' })
  @ApiParam({ name: 'lessonId', description: 'Lesson UUID' })
  @ApiResponse({ status: 200, description: 'Quiz details' })
  async findByLesson(@Param('lessonId', ParseUUIDPipe) lessonId: string) {
    return this.quizService.findByLesson(lessonId);
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get all quizzes for a course' })
  @ApiParam({ name: 'courseId', description: 'Course UUID' })
  @ApiResponse({ status: 200, description: 'List of quizzes' })
  async findByCourse(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.quizService.findByCourse(courseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quiz by ID' })
  @ApiParam({ name: 'id', description: 'Quiz UUID' })
  @ApiResponse({ status: 200, description: 'Quiz details' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.quizService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a quiz' })
  @ApiParam({ name: 'id', description: 'Quiz UUID' })
  @ApiResponse({ status: 200, description: 'Quiz updated successfully' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateQuizDto: UpdateQuizSwaggerDto,
  ) {
    return this.quizService.update(id, updateQuizDto);
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit quiz answers' })
  @ApiParam({ name: 'id', description: 'Quiz UUID' })
  @ApiResponse({ status: 200, description: 'Quiz submitted successfully' })
  async submit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() submitQuizDto: SubmitQuizDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.quizService.submitQuiz(userId, id, submitQuizDto);
  }

  @Get(':id/attempts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user attempts for a quiz' })
  @ApiParam({ name: 'id', description: 'Quiz UUID' })
  @ApiResponse({ status: 200, description: 'List of attempts' })
  async getAttempts(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.quizService.getAttempts(userId, id);
  }

  @Get(':id/best-attempt')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get best attempt for a quiz' })
  @ApiParam({ name: 'id', description: 'Quiz UUID' })
  @ApiResponse({ status: 200, description: 'Best attempt' })
  async getBestAttempt(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.quizService.getBestAttempt(userId, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a quiz' })
  @ApiParam({ name: 'id', description: 'Quiz UUID' })
  @ApiResponse({ status: 204, description: 'Quiz deleted successfully' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.quizService.remove(id);
  }
}
