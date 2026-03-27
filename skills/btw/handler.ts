import { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware } from '../../lib/auth';
import { validateInput } from '../../lib/validation';
import { successResponse, errorResponse } from '../../lib/response';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface BtwInput {
  question: string;
  options?: string[];
  default?: string;
  timeout?: number;
  priority?: 'urgent' | 'normal' | 'low';
  context?: Record<string, any>;
}

interface BtwOutput {
  answer: string;
  answered_at: string;
  timed_out: boolean;
  response_time_ms: number;
}

async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();

  // Validate input
  const validation = validateInput(req.body, {
    input: { type: 'object', required: true }
  });

  if (!validation.valid) {
    return errorResponse(res, 'Invalid input', 400, validation.errors);
  }

  const input = validation.data!.input as BtwInput;

  // Validate required fields
  if (!input.question || typeof input.question !== 'string' || input.question.trim() === '') {
    return errorResponse(res, 'Missing or invalid required field: question (non-empty string)', 400);
  }

  // Set defaults
  const timeout = Math.min(input.timeout || 300, 3600); // Max 1 hour
  const priority = input.priority || 'normal';
  const options = input.options || [];
  const defaultAnswer = input.default || (options.length > 0 ? options[0] : 'yes');
  const context = input.context || {};

  // Extract user_id from Gateway (passed via custom header or body)
  const userId = req.headers['x-user-id'] as string || (req.body as any).user_id;
  
  if (!userId) {
    return errorResponse(res, 'User ID required (should be provided by Gateway)', 401);
  }

  try {
    // Create question in database
    const questionId = await createQuestion({
      question: input.question,
      options,
      default: defaultAnswer,
      timeout,
      priority,
      context,
      user_id: userId
    });

    // Send notifications (async, don't wait)
    sendNotifications(questionId, {
      question: input.question,
      options,
      priority,
      user_id: userId
    }).catch(err => console.error('Notification error:', err));

    // Wait for answer or timeout
    const result = await waitForAnswer(questionId, timeout, defaultAnswer);

    const responseTime = Date.now() - startTime;

    return successResponse(res, {
      answer: result.answer,
      answered_at: result.answered_at,
      timed_out: result.timed_out,
      response_time_ms: responseTime,
      _meta: {
        skill: 'btw',
        latency_ms: responseTime,
        question_id: questionId
      }
    });
  } catch (error: any) {
    console.error('btw skill error:', error);
    return errorResponse(res, 'Failed to process question', 500, error.message);
  }
}

// Helper functions

async function createQuestion(data: {
  question: string;
  options: string[];
  default: string;
  timeout: number;
  priority: string;
  context: Record<string, any>;
  user_id: string;
}): Promise<string> {
  const expiresAt = new Date(Date.now() + data.timeout * 1000);
  
  const { data: question, error } = await supabase
    .from('btw_questions')
    .insert({
      user_id: data.user_id,
      question: data.question,
      options: data.options,
      default_answer: data.default,
      timeout_seconds: data.timeout,
      priority: data.priority,
      context: data.context,
      expires_at: expiresAt.toISOString(),
      status: 'pending'
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create question:', error);
    throw new Error(`Database error: ${error.message}`);
  }

  return question.id;
}

async function sendNotifications(questionId: string, data: {
  question: string;
  options: string[];
  priority: string;
  user_id: string;
}): Promise<void> {
  // TODO: Implement notification system
  // For now, just log
  console.log(`[btw] Question ${questionId} created for user ${data.user_id}`);
  console.log(`  Priority: ${data.priority}`);
  console.log(`  Question: ${data.question}`);
  console.log(`  Options: ${data.options.join(', ')}`);
  
  // Future implementations:
  // 1. WebSocket push to connected clients
  // 2. Mobile push notification (via Firebase/OneSignal)
  // 3. Slack webhook (if user configured)
  // 4. Email (for urgent priority)
  // 5. SMS (for critical priority)
}

async function waitForAnswer(
  questionId: string, 
  timeout: number,
  defaultAnswer: string
): Promise<{
  answer: string;
  answered_at: string;
  timed_out: boolean;
}> {
  const startTime = Date.now();
  const pollInterval = 1000; // Poll every 1 second
  const maxPolls = Math.ceil(timeout);

  for (let i = 0; i < maxPolls; i++) {
    // Check if answered
    const { data: question, error } = await supabase
      .from('btw_questions')
      .select('status, answer, answered_at')
      .eq('id', questionId)
      .single();

    if (error) {
      console.error('Failed to poll question:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    if (question.status === 'answered' && question.answer) {
      return {
        answer: question.answer,
        answered_at: question.answered_at,
        timed_out: false
      };
    }

    // Check if expired
    if (question.status === 'expired') {
      return {
        answer: question.answer || defaultAnswer,
        answered_at: question.answered_at || new Date().toISOString(),
        timed_out: true
      };
    }

    // Wait before next poll
    const elapsed = Date.now() - startTime;
    if (elapsed >= timeout * 1000) {
      break;
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  // Timeout reached, mark as expired and return default
  const now = new Date().toISOString();
  
  await supabase
    .from('btw_questions')
    .update({
      status: 'expired',
      timed_out: true,
      answer: defaultAnswer,
      answered_at: now
    })
    .eq('id', questionId);

  return {
    answer: defaultAnswer,
    answered_at: now,
    timed_out: true
  };
}

export default authMiddleware(handler);
