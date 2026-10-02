import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  PageBreak,
  TextRun,
  LevelFormat,
  AlignmentType,
} from 'docx'
import { saveAs } from 'file-saver'
import { normalizeBodyToHtml } from './richText.js'

const NUMBERED_LIST_REFERENCE = 'chapter-numbered-list'

const numberingConfig = {
  config: [
    {
      reference: NUMBERED_LIST_REFERENCE,
      levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.START }],
    },
  ],
}

function collectRuns(node, marks = { bold: false, italic: false, underline: false }) {
  const runs = []
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      if (child.textContent) {
        runs.push(
          new TextRun({
            text: child.textContent,
            bold: marks.bold || undefined,
            italics: marks.italic || undefined,
            underline: marks.underline ? {} : undefined,
          }),
        )
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = child.tagName.toLowerCase()
      if (tag === 'br') {
        runs.push(new TextRun({ text: '', break: 1 }))
      } else {
        runs.push(
          ...collectRuns(child, {
            bold: marks.bold || tag === 'strong' || tag === 'b',
            italic: marks.italic || tag === 'em' || tag === 'i',
            underline: marks.underline || tag === 'u',
          }),
        )
      }
    }
  })
  return runs
}

function blockToParagraphs(el) {
  const tag = el.tagName.toLowerCase()
  if (tag === 'h1' || tag === 'h2') {
    return [new Paragraph({ heading: HeadingLevel.HEADING_2, children: collectRuns(el) })]
  }
  if (tag === 'ul') {
    return Array.from(el.children).map((li) => new Paragraph({ children: collectRuns(li), bullet: { level: 0 } }))
  }
  if (tag === 'ol') {
    return Array.from(el.children).map(
      (li) => new Paragraph({ children: collectRuns(li), numbering: { reference: NUMBERED_LIST_REFERENCE, level: 0 } }),
    )
  }
  const runs = collectRuns(el)
  return [new Paragraph({ children: runs.length ? runs : [new TextRun('')], spacing: { after: 200 } })]
}

function bodyToParagraphs(body) {
  const container = document.createElement('div')
  container.innerHTML = normalizeBodyToHtml(body)
  const paragraphs = []
  Array.from(container.children).forEach((el) => paragraphs.push(...blockToParagraphs(el)))
  return paragraphs.length ? paragraphs : [new Paragraph({ children: [new TextRun('')] })]
}

function safeFileName(name) {
  return (name || 'untitled').replace(/[\\/:*?"<>|]/g, '-').trim() || 'untitled'
}

export async function exportChapterToDocx(chapter) {
  const doc = new Document({
    numbering: numberingConfig,
    sections: [
      {
        children: [
          new Paragraph({ text: chapter.title, heading: HeadingLevel.TITLE }),
          ...bodyToParagraphs(chapter.body),
        ],
      },
    ],
  })
  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${safeFileName(chapter.title)}.docx`)
}

export async function exportBookToDocx(book, chapters) {
  const children = [new Paragraph({ text: book.title, heading: HeadingLevel.TITLE })]
  if (book.description) {
    children.push(new Paragraph({ children: [new TextRun({ text: book.description, italics: true })] }))
  }

  chapters.forEach((chapter, index) => {
    if (index > 0) {
      children.push(new Paragraph({ children: [new PageBreak()] }))
    }
    children.push(new Paragraph({ text: chapter.title, heading: HeadingLevel.HEADING_1 }))
    children.push(...bodyToParagraphs(chapter.body))
  })

  const doc = new Document({ numbering: numberingConfig, sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${safeFileName(book.title)}.docx`)
}
