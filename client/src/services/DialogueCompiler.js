import { summarizeText } from '../api/aiAPI';

class DialogueCompiler {
  constructor() {
    this.transcripts = {
      main: '',
      breakouts: {}
    };
  }

  updateTranscript(roomType, roomName, transcript) {
    if (roomType === 'main') {
      this.transcripts.main = transcript;
    } else {
      this.transcripts.breakouts[roomName] = transcript;
    }
  }

  async compileFinal() {
    const allTranscripts = [
      this.transcripts.main,
      ...Object.values(this.transcripts.breakouts)
    ].filter(transcript => transcript.trim() !== '').join('\n\n');

    if (allTranscripts) {
      try {
        const summary = await summarizeText(allTranscripts);
        return {
          success: true,
          summary: summary,
          message: 'Final compilation successful'
        };
      } catch (error) {
        console.error('Error in final compilation:', error);
        return {
          success: false,
          summary: '',
          message: `Error in final compilation: ${error.message}`
        };
      }
    } else {
      return {
        success: false,
        summary: '',
        message: 'No transcripts available for compilation'
      };
    }
  }

  async compileBreakoutRooms() {
    const breakoutTranscripts = Object.values(this.transcripts.breakouts)
      .filter(transcript => transcript.trim() !== '')
      .join('\n\n');

    if (breakoutTranscripts) {
      try {
        const summary = await summarizeText(breakoutTranscripts);
        return {
          success: true,
          summary: summary,
          message: 'Breakout room compilation successful'
        };
      } catch (error) {
        console.error('Error in breakout room compilation:', error);
        return {
          success: false,
          summary: '',
          message: `Error in breakout room compilation: ${error.message}`
        };
      }
    } else {
      return {
        success: false,
        summary: '',
        message: 'No breakout room transcripts available for compilation'
      };
    }
  }
}

export default DialogueCompiler;