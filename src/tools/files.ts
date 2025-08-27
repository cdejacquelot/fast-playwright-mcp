import { z } from 'zod';
import { expectationSchema } from '../schemas/expectation.js';
import { defineTabTool } from './tool.js';

const uploadFile = defineTabTool({
  capability: 'core',
  schema: {
    name: 'browser_file_upload',
    title: 'Upload files',
    description: 'Upload one or multiple files to file input',
    inputSchema: z.object({
      paths: z.array(z.string()).describe('Absolute paths to upload (array)'),
      expectation: expectationSchema.describe(
        'Page state config. Use batch_execute for click→upload'
      ),
    }),
    type: 'destructive',
  },
  handle: async (tab, params, response) => {
    response.setIncludeSnapshot();
    const modalState = tab
      .modalStates()
      .find((state) => state.type === 'fileChooser');
    if (!modalState) {
      throw new Error('No file chooser visible');
    }
    response.addCode(
      `await fileChooser.setFiles(${JSON.stringify(params.paths)})`
    );
    tab.clearModalState(modalState);
    await tab.waitForCompletion(async () => {
      await modalState.fileChooser.setFiles(params.paths);
    });
  },
  clearsModalState: 'fileChooser',
});
export default [uploadFile];
