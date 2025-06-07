import { createErrorResponse, createSuccessResponse } from '../utils';

describe('Utils', () => {
  describe('createErrorResponse', () => {
    it('should create a proper JSON-RPC error response', () => {
      const result = createErrorResponse('Test error', -32603, 'test-id');
      
      expect(result).toEqual({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Test error',
        },
        id: 'test-id',
      });
    });

    it('should use default error code when not provided', () => {
      const result = createErrorResponse('Test error', undefined, 'test-id');
      
      expect(result.error.code).toBe(-32603);
    });

    it('should handle null id', () => {
      const result = createErrorResponse('Test error', -32603, null);
      
      expect(result.id).toBeNull();
    });
  });

  describe('createSuccessResponse', () => {
    it('should create a proper JSON-RPC success response', () => {
      const testResult = { data: 'test' };
      const result = createSuccessResponse(testResult, 'test-id');
      
      expect(result).toEqual({
        jsonrpc: '2.0',
        result: testResult,
        id: 'test-id',
      });
    });

    it('should handle null result', () => {
      const result = createSuccessResponse(null, 'test-id');
      
      expect(result.result).toBeNull();
    });

    it('should handle null id', () => {
      const result = createSuccessResponse({ data: 'test' }, null);
      
      expect(result.id).toBeNull();
    });
  });
}); 