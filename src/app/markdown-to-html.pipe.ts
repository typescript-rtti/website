import { Pipe, PipeTransform } from '@angular/core';
import { marked } from 'marked';
import hljs from 'highlight.js';

@Pipe({
  name: 'markdownToHtml'
})
export class MarkdownToHtmlPipe implements PipeTransform {
  transform(value: string): string {
    if (!value)
      return '';
    
    marked.setOptions({
      highlight: (code, lang) => {
        if (!lang)
          return code;
        if (lang === 'jsonc')
          lang = 'json';
        
        return hljs.highlight(lang, code || 'text').value
      }
    })

    return marked.parse(value);
  }
}