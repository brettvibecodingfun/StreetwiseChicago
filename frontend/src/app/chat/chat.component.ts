import { Component, NgZone, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
}

@Component({
  selector: 'app-chat',
  imports: [FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent {
  private readonly http = inject(HttpClient);
  private readonly zone = inject(NgZone);

  messages: ChatMessage[] = [
    {
      role: 'bot',
      text: 'Welcome to Chicago Food Inspections!\n\nAsk me anything, for example:\n• "Give me all the inspections in the last 5 days"\n• "What restaurants failed their inspection on April 10th, 2026?"\n• "Show me high-risk restaurants that passed"\n• "Summary" — AI analysis of common violation themes',
    },
  ];
  input = '';
  loading = false;
  readonly suggestions = ['Top violations near Wrigley', 'Worst risk restaurants in 60614', 'Recent closures downtown'];

  send(): void {
    const text = this.input.trim();
    if (!text) return;

    this.messages.push({ role: 'user', text });
    this.input = '';
    this.loading = true;

    const lower = text.toLowerCase();

    if (lower.includes('summary') || lower.includes('violation theme') || lower.includes('common violation')) {
      this.fetchViolationsSummary();
    } else {
      this.fetchQueryStreamed(text);
    }
  }

  private fetchQueryStreamed(question: string): void {
    const botMsg: ChatMessage = { role: 'bot', text: '' };
    this.messages.push(botMsg);

    fetch(`${environment.apiUrl}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    }).then((response) => {
      if (!response.ok || !response.body) {
        this.zone.run(() => {
          botMsg.text = 'Error processing your question. Is the backend running?';
          this.loading = false;
        });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const read = (): void => {
        reader.read().then(({ done, value }) => {
          if (done) {
            this.zone.run(() => { this.loading = false; });
            return;
          }

          buffer += decoder.decode(value, { stream: true });

          // SSE messages are separated by double newlines
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6));
              this.zone.run(() => {
                if (event.type === 'chunk') {
                  botMsg.text += event.text;
                } else if (event.type === 'done') {
                  this.loading = false;
                } else if (event.type === 'error') {
                  botMsg.text = botMsg.text || event.message;
                  this.loading = false;
                }
              });
            } catch {
              // malformed SSE line — skip
            }
          }

          read();
        }).catch(() => {
          this.zone.run(() => {
            botMsg.text = botMsg.text || 'Connection lost. Please try again.';
            this.loading = false;
          });
        });
      };

      read();
    }).catch(() => {
      this.zone.run(() => {
        botMsg.text = 'Error processing your question. Is the backend running?';
        this.loading = false;
      });
    });
  }

  private fetchViolationsSummary(): void {
    this.messages.push({ role: 'bot', text: 'Analyzing violations with Claude AI... this may take a moment.' });

    this.http
      .get<{ summary: string; totalInspections: number }>(
        `${environment.apiUrl}/api/analysis/violations-summary`
      )
      .subscribe({
        next: (data) => {
          this.messages.push({
            role: 'bot',
            text: `AI Analysis of ${data.totalInspections} failed inspections:\n\n${data.summary}`,
          });
          this.loading = false;
        },
        error: () => {
          this.messages.push({ role: 'bot', text: 'Error generating summary. Is the ANTHROPIC_API_KEY set?' });
          this.loading = false;
        },
      });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }
}
