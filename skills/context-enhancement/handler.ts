import { VercelRequest, VercelResponse } from '@vercel/node';

// Types
interface Pattern {
  pattern: string;
  confidence: number;
  examples: string[];
  rule: string;
}

interface UserContext {
  preferences: Record<string, any>;
  patterns: Pattern[];
  rules: string[];
  metadata: {
    total_questions: number;
    patterns_detected: number;
    rules_generated: number;
    last_updated: string;
  };
}

interface AnalyzeAnswerInput {
  action: 'analyze-answer';
  question: string;
  context: string;
  answer: string;
  user_id?: string;
}

interface GetContextInput {
  action: 'get-context';
  user_id?: string;
  scope?: 'preferences' | 'patterns' | 'rules' | 'all';
}

interface UpdateContextInput {
  action: 'update-context';
  user_id?: string;
  updates: Record<string, any>;
}

interface DetectPatternsInput {
  action: 'detect-patterns';
  user_id?: string;
  history_days?: number;
}

type Input = AnalyzeAnswerInput | GetContextInput | UpdateContextInput | DetectPatternsInput;

// In-memory storage (in production, use Redis or database)
const contextStore = new Map<string, UserContext>();

// Pattern detection logic
function detectPattern(question: string, context: string, answer: string): {
  pattern_detected: string | null;
  confidence: number;
  suggested_rule: string | null;
  context_update: Record<string, any> | null;
} {
  const lowerQuestion = question.toLowerCase();
  const lowerAnswer = answer.toLowerCase();
  
  // Language preference pattern
  if (lowerQuestion.includes('typescript') || lowerQuestion.includes('javascript')) {
    if (lowerAnswer.includes('typescript') || lowerAnswer === 'ts') {
      return {
        pattern_detected: 'language_preference',
        confidence: 0.95,
        suggested_rule: 'User prefers TypeScript for new code',
        context_update: {
          'preferences.language': 'TypeScript',
          'preferences.use_cases': [context]
        }
      };
    } else if (lowerAnswer.includes('javascript') || lowerAnswer === 'js') {
      return {
        pattern_detected: 'language_preference',
        confidence: 0.95,
        suggested_rule: 'User prefers JavaScript for new code',
        context_update: {
          'preferences.language': 'JavaScript',
          'preferences.use_cases': [context]
        }
      };
    }
  }
  
  // Deployment strategy pattern
  if (lowerQuestion.includes('deploy') || lowerQuestion.includes('staging') || lowerQuestion.includes('production')) {
    if (lowerAnswer.includes('staging') || lowerAnswer.includes('stage first')) {
      return {
        pattern_detected: 'deployment_strategy',
        confidence: 0.98,
        suggested_rule: 'Always deploy to staging first, then production after validation',
        context_update: {
          'preferences.deployment': 'staging-first'
        }
      };
    }
  }
  
  // Code style pattern
  if (lowerQuestion.includes('quote') || lowerQuestion.includes('semicolon') || lowerQuestion.includes('comma')) {
    const updates: Record<string, any> = {};
    let rule = 'Code style: ';
    
    if (lowerAnswer.includes('single')) {
      updates['preferences.code_style.quotes'] = 'single';
      rule += 'single quotes, ';
    } else if (lowerAnswer.includes('double')) {
      updates['preferences.code_style.quotes'] = 'double';
      rule += 'double quotes, ';
    }
    
    if (lowerAnswer.includes('yes') && lowerQuestion.includes('semicolon')) {
      updates['preferences.code_style.semicolons'] = true;
      rule += 'use semicolons, ';
    }
    
    if (Object.keys(updates).length > 0) {
      return {
        pattern_detected: 'code_style',
        confidence: 0.92,
        suggested_rule: rule.slice(0, -2),
        context_update: updates
      };
    }
  }
  
  // Generic preference pattern
  return {
    pattern_detected: 'generic_preference',
    confidence: 0.7,
    suggested_rule: `User answered "${answer}" for "${question}"`,
    context_update: {
      [`preferences.${context.toLowerCase().replace(/\s+/g, '_')}`]: answer
    }
  };
}

// Get or create user context
function getUserContext(userId: string): UserContext {
  if (!contextStore.has(userId)) {
    contextStore.set(userId, {
      preferences: {},
      patterns: [],
      rules: [],
      metadata: {
        total_questions: 0,
        patterns_detected: 0,
        rules_generated: 0,
        last_updated: new Date().toISOString()
      }
    });
  }
  return contextStore.get(userId)!;
}

// Update user context
function updateUserContext(userId: string, updates: Record<string, any>): void {
  const context = getUserContext(userId);
  
  for (const [key, value] of Object.entries(updates)) {
    const keys = key.split('.');
    let current: any = context;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
  }
  
  context.metadata.last_updated = new Date().toISOString();
  contextStore.set(userId, context);
}

// Main handler
async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const startTime = Date.now();
  
  try {
    const input = req.body as Input;
    
    if (!input.action) {
      return res.status(400).json({ error: 'Missing required field: action' });
    }
    
    const userId = input.user_id || 'default';
    
    switch (input.action) {
      case 'analyze-answer': {
        const { question, context, answer } = input as AnalyzeAnswerInput;
        
        if (!question || !answer) {
          return res.status(400).json({ error: 'Missing required fields: question, answer' });
        }
        
        const detection = detectPattern(question, context || '', answer);
        const userContext = getUserContext(userId);
        
        // Update context
        if (detection.context_update) {
          updateUserContext(userId, detection.context_update);
        }
        
        // Add pattern if detected
        if (detection.pattern_detected && detection.pattern_detected !== 'generic_preference') {
          const existingPattern = userContext.patterns.find(p => p.pattern === detection.pattern_detected);
          
          if (existingPattern) {
            existingPattern.confidence = Math.min(0.99, existingPattern.confidence + 0.05);
            existingPattern.examples.push(context || question);
          } else {
            userContext.patterns.push({
              pattern: detection.pattern_detected,
              confidence: detection.confidence,
              examples: [context || question],
              rule: detection.suggested_rule || ''
            });
            userContext.metadata.patterns_detected++;
          }
        }
        
        // Add rule if suggested
        if (detection.suggested_rule && !userContext.rules.includes(detection.suggested_rule)) {
          userContext.rules.push(detection.suggested_rule);
          userContext.metadata.rules_generated++;
        }
        
        userContext.metadata.total_questions++;
        contextStore.set(userId, userContext);
        
        return res.status(200).json({
          pattern_detected: detection.pattern_detected,
          confidence: detection.confidence,
          suggested_rule: detection.suggested_rule,
          context_update: detection.context_update,
          _meta: {
            skill: 'context-enhancement',
            latency_ms: Date.now() - startTime
          }
        });
      }
      
      case 'get-context': {
        const { scope = 'all' } = input as GetContextInput;
        const userContext = getUserContext(userId);
        
        let result: any = {};
        
        if (scope === 'all' || scope === 'preferences') {
          result.preferences = userContext.preferences;
        }
        if (scope === 'all' || scope === 'patterns') {
          result.patterns = userContext.patterns;
        }
        if (scope === 'all' || scope === 'rules') {
          result.rules = userContext.rules;
        }
        
        return res.status(200).json({
          context: result,
          _meta: {
            skill: 'context-enhancement',
            latency_ms: Date.now() - startTime
          }
        });
      }
      
      case 'update-context': {
        const { updates } = input as UpdateContextInput;
        
        if (!updates) {
          return res.status(400).json({ error: 'Missing required field: updates' });
        }
        
        updateUserContext(userId, updates);
        
        return res.status(200).json({
          success: true,
          _meta: {
            skill: 'context-enhancement',
            latency_ms: Date.now() - startTime
          }
        });
      }
      
      case 'detect-patterns': {
        const { history_days = 30 } = input as DetectPatternsInput;
        const userContext = getUserContext(userId);
        
        // In a real implementation, analyze historical data
        // For now, return existing patterns
        const patterns = userContext.patterns.map(p => ({
          pattern: p.pattern,
          frequency: p.examples.length,
          confidence: p.confidence,
          suggested_rule: p.rule
        }));
        
        return res.status(200).json({
          patterns,
          _meta: {
            skill: 'context-enhancement',
            latency_ms: Date.now() - startTime
          }
        });
      }
      
      default:
        return res.status(400).json({ error: `Unknown action: ${(input as any).action}` });
    }
  } catch (error: any) {
    console.error('Context enhancement error:', error);
    return res.status(500).json({ 
      error: error.message,
      _meta: {
        skill: 'context-enhancement',
        latency_ms: Date.now() - startTime
      }
    });
  }
}

export default authMiddleware(handler);
