import { z } from 'zod';
import { expectationSchema } from '../schemas/expectation.js';
import { defineTabTool } from './tool.js';

const handleDialog = defineTabTool({
  capability: 'core',
  schema: {
    name: 'browser_handle_dialog',
    title: 'Handle a dialog',
    description: 'Handle a dialog (alert, confirm, prompt)',
    inputSchema: z.object({
      accept: z.boolean().describe('Accept (true) or dismiss (false)'),
      promptText: z.string().optional().describe('Text for prompt dialogs'),
      expectation: expectationSchema.describe(
        'Page state after dialog. Use batch_execute for workflows'
      ),
    }),
    type: 'destructive',
  },
  handle: async (tab, params, response) => {
    response.setIncludeSnapshot();
    const dialogState = tab
      .modalStates()
      .find((state) => state.type === 'dialog');
    if (!dialogState) {
      throw new Error('No dialog visible');
    }
    tab.clearModalState(dialogState);
    await tab.waitForCompletion(async () => {
      if (params.accept) {
        await dialogState.dialog.accept(params.promptText);
      } else {
        await dialogState.dialog.dismiss();
      }
    });
  },
  clearsModalState: 'dialog',
});
export default [handleDialog];
