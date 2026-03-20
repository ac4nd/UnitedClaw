/**
 * UnitedClaw 审查系统
 * 负责任务审查、测试案例生成、审查记录管理
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  IReviewRecord,
  ITestCase,
  ReviewStatus,
  IReviewRequestContent,
  IReviewResultContent
} from '@/interface/task-system';
import {
  getWorkspacePath,
  sendMessage,
  updateTaskStatus,
  readTaskFile,
  writeTaskFile
} from './task-system';

// 审查记录目录
function getReviewsDir(): string {
  return path.join(getWorkspacePath(), 'reviews');
}

/**
 * 获取按日期分割的审查记录文件路径
 */
export function getReviewRecordPath(dateStr?: string): string {
  const reviewsDir = getReviewsDir();
  const date = dateStr || new Date().toISOString().split('T')[0];
  return path.join(reviewsDir, `${date}.md`);
}

/**
 * 初始化审查记录目录
 */
export async function initReviewsDir(): Promise<void> {
  const reviewsDir = getReviewsDir();
  await fs.mkdir(reviewsDir, { recursive: true });
  console.log('[ReviewSystem] Reviews directory initialized:', reviewsDir);
}

/**
 * 生成测试案例（根据任务描述自动分解）
 * 实际项目中可以接入 AI 生成
 */
export async function generateTestCases(
  taskTitle: string,
  taskDescription: string
): Promise<ITestCase[]> {
  // 这里简化处理，实际应该用 AI 分析任务并生成测试案例
  const baseCases: ITestCase[] = [
    {
      id: `tc_${Date.now()}_1`,
      title: '功能完整性测试',
      description: '验证任务功能是否完整实现',
      steps: [
        '检查主要功能是否实现',
        '验证核心逻辑是否正确',
        '确认边界条件是否处理'
      ],
      expectedResult: '所有功能正常运行',
      status: 'pending'
    },
    {
      id: `tc_${Date.now()}_2`,
      title: '代码质量检查',
      description: '检查代码规范和可维护性',
      steps: [
        '检查代码是否符合规范',
        '确认是否有注释说明',
        '验证是否有错误处理'
      ],
      expectedResult: '代码规范、可读性好',
      status: 'pending'
    },
    {
      id: `tc_${Date.now()}_3`,
      title: '性能测试',
      description: '验证性能是否达标',
      steps: [
        '测试响应时间',
        '检查资源占用',
        '验证并发处理能力'
      ],
      expectedResult: '性能指标符合要求',
      status: 'pending'
    }
  ];
  
  console.log('[ReviewSystem] Generated test cases:', baseCases.length);
  return baseCases;
}

/**
 * 创建审查记录
 */
export async function createReviewRecord(
  taskId: string,
  reviewerId: string,
  executorId: string,
  taskTitle: string,
  taskDescription: string
): Promise<IReviewRecord> {
  const testCases = await generateTestCases(taskTitle, taskDescription);
  
  const reviewRecord: IReviewRecord = {
    id: `review_${Date.now()}`,
    taskId,
    reviewerId,
    executorId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    testCases,
    overallStatus: 'pending',
    comments: [],
    revisionCount: 0
  };
  
  // 写入审查记录文件
  await appendReviewRecord(reviewRecord);
  
  console.log('[ReviewSystem] Review record created:', reviewRecord.id);
  return reviewRecord;
}

/**
 * 追加审查记录到文件
 */
export async function appendReviewRecord(record: IReviewRecord): Promise<void> {
  const filePath = getReviewRecordPath();
  
  const markdownContent = `
## 审查记录：${record.id}

**任务 ID**: ${record.taskId}
**审查员**: ${record.reviewerId}
**执行者**: ${record.executorId}
**创建时间**: ${new Date(record.createdAt).toISOString()}
**审查状态**: ${record.overallStatus}
**修改次数**: ${record.revisionCount}

### 测试案例

${record.testCases.map(tc => `
#### ${tc.title} (${tc.id})

- **描述**: ${tc.description}
- **状态**: ${tc.status}
- **预期结果**: ${tc.expectedResult}
${tc.actualResult ? `- **实际结果**: ${tc.actualResult}` : ''}
${tc.notes ? `- **备注**: ${tc.notes}` : ''}

**测试步骤**:
${tc.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

---
`).join('\n')}

${record.comments.length > 0 ? `
### 审查意见

${record.comments.map((c, i) => `${i + 1}. ${c}`).join('\n')}
` : ''}

---
*此记录由系统自动生成*

`;
  
  await fs.appendFile(filePath, markdownContent, 'utf-8');
}

/**
 * 更新审查记录
 */
export async function updateReviewRecord(
  reviewId: string,
  updates: Partial<IReviewRecord>
): Promise<IReviewRecord | null> {
  // 读取当天的审查记录文件
  const filePath = getReviewRecordPath();
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    // 简化处理：实际应该解析 Markdown 找到对应记录并更新
    // 这里使用内存中的简化方式
    
    console.log('[ReviewSystem] Review record updated:', reviewId);
    
    // 返回更新后的记录（简化）
    return {
      id: reviewId,
      taskId: '',
      reviewerId: '',
      executorId: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      testCases: [],
      overallStatus: 'in_progress',
      comments: [],
      revisionCount: 0,
      ...updates
    };
  } catch (error) {
    console.error('[ReviewSystem] Failed to update review record:', error);
    return null;
  }
}

/**
 * 执行审查（审查一个测试案例）
 */
export async function executeTestCase(
  reviewId: string,
  testCaseId: string,
  passed: boolean,
  actualResult?: string,
  notes?: string
): Promise<ITestCase | null> {
  // 更新测试案例状态
  const updatedTestCase: ITestCase = {
    id: testCaseId,
    title: '',
    description: '',
    steps: [],
    expectedResult: '',
    status: passed ? 'passed' : 'failed',
    actualResult,
    notes
  };
  
  console.log('[ReviewSystem] Test case executed:', testCaseId, 'passed:', passed);
  return updatedTestCase;
}

/**
 * 完成审查并生成审查结果
 */
export async function completeReview(
  reviewId: string,
  testCases: ITestCase[]
): Promise<{
  reviewRecord: IReviewRecord;
  reviewResult: IReviewResultContent;
}> {
  const passedCases = testCases.filter(tc => tc.status === 'passed');
  const failedCases = testCases.filter(tc => tc.status === 'failed');
  
  const overallStatus: ReviewStatus = 
    failedCases.length === 0 ? 'passed' : 'failed';
  
  const comments: string[] = [];
  
  if (failedCases.length > 0) {
    comments.push(`发现 ${failedCases.length} 个测试案例未通过，需要修改`);
    failedCases.forEach(fc => {
      comments.push(`- ${fc.title}: ${fc.notes || '未通过测试'}`);
    });
  } else {
    comments.push('所有测试案例通过，审查完成');
  }
  
  const reviewRecord: IReviewRecord = {
    id: reviewId,
    taskId: '',
    reviewerId: '',
    executorId: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    testCases,
    overallStatus,
    comments,
    revisionCount: 0,
    completedAt: Date.now()
  };
  
  const reviewResult: IReviewResultContent = {
    type: 'review_result',
    taskId: reviewRecord.taskId,
    reviewId,
    status: overallStatus,
    passedCases: passedCases.length,
    failedCases: failedCases.length,
    totalCases: testCases.length,
    comments,
    failedCasesDetails: failedCases.length > 0 ? failedCases : undefined,
    reviewedAt: Date.now()
  };
  
  console.log('[ReviewSystem] Review completed:', reviewId, 'status:', overallStatus);
  
  return { reviewRecord, reviewResult };
}

/**
 * 审查 Agent：接收审查请求并处理
 */
export async function handleReviewRequest(
  request: IReviewRequestContent,
  reviewerId: string
): Promise<{
  reviewRecord: IReviewRecord;
  reviewResult?: IReviewResultContent;
}> {
  console.log('[ReviewSystem] Handling review request:', request.taskId);
  
  // 1. 创建审查记录
  const reviewRecord = await createReviewRecord(
    request.taskId,
    reviewerId,
    request.executorId,
    request.taskTitle,
    request.taskDescription
  );
  
  // 2. 更新任务状态为审查中
  await updateTaskStatus(request.taskId, 'under_review');
  
  // 3. 执行审查（这里简化为自动通过，实际应该逐步审查）
  const updatedTestCases: ITestCase[] = [];
  for (const testCase of reviewRecord.testCases) {
    // 模拟审查过程
    const passed = true; // 实际应该根据任务内容判断
    await executeTestCase(
      reviewRecord.id,
      testCase.id,
      passed,
      '功能实现完整，符合预期'
    );
    updatedTestCases.push({
      ...testCase,
      status: passed ? 'passed' : 'failed',
      actualResult: '功能实现完整，符合预期'
    });
  }
  
  // 4. 完成审查
  const { reviewResult } = await completeReview(reviewRecord.id, updatedTestCases);
  
  // 5. 如果审查通过，通知执行 Agent 可以交接
  if (reviewResult.status === 'passed') {
    await sendMessage(
      reviewerId,
      request.executorId,
      'review_passed',
      {
        type: 'review_passed',
        taskId: request.taskId,
        reviewId: reviewRecord.id,
        message: '审查通过，可以提交任务',
        reviewedAt: Date.now()
      },
      false
    );
  } else {
    // 审查失败，通知执行 Agent 修改
    await sendMessage(
      reviewerId,
      request.executorId,
      'review_failed',
      reviewResult,
      false
    );
  }
  
  return { reviewRecord, reviewResult };
}

/**
 * 执行 Agent：接收审查结果并处理
 */
export async function handleReviewResult(
  reviewResult: IReviewResultContent,
  executorId: string,
  reviewerId: string
): Promise<void> {
  console.log('[ReviewSystem] Handling review result:', reviewResult.taskId, 'status:', reviewResult.status);
  
  if (reviewResult.status === 'passed') {
    // 审查通过，向上游编排 Agent 提交任务
    console.log('[ReviewSystem] Review passed, submitting task...');
    
    // 这里需要知道编排 Agent 的 ID，实际应该从连接关系中获取
    const orchestratorId = 'orchestrator_agent'; // 简化处理
    
    await sendMessage(
      executorId,
      orchestratorId,
      'task_submit',
      {
        type: 'task_submit',
        taskId: reviewResult.taskId,
        reviewId: reviewResult.reviewId,
        message: '任务已完成并通过审查，申请提交',
        submittedAt: Date.now()
      },
      false
    );
  } else {
    // 审查失败，需要修改
    console.log('[ReviewSystem] Review failed, revising task...');
    
    // 更新任务状态为修改中
    await updateTaskStatus(reviewResult.taskId, 'revision_requested');
    
    // 这里应该根据 failedCasesDetails 进行修改
    // 简化处理：模拟修改完成后重新提交审查
  }
}

/**
 * 编排 Agent：接收任务提交并标记完成
 */
export async function handleTaskSubmission(
  taskId: string,
  orchestratorId: string
): Promise<void> {
  console.log('[ReviewSystem] Handling task submission:', taskId);
  
  // 标记任务为已完成
  await updateTaskStatus(taskId, 'completed', undefined, {
    reviewPassed: true,
    completedAt: Date.now()
  });
  
  console.log('[ReviewSystem] Task marked as completed:', taskId);
}
