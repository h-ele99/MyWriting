import { Document, Packer, Paragraph, HeadingLevel, PageBreak, TextRun } from 'docx'
import { saveAs } from 'file-saver'

function bodyToParagraphs(body) {
  const lines = (body || '').split('\n')
  return lines.map(
    (line) =>
      new Paragraph({
        children: [new TextRun(line)],
        spacing: { after: 200 },
      }),
  )
}

function safeFileName(name) {
  return (name || 'untitled').replace(/[\\/:*?"<>|]/g, '-').trim() || 'untitled'
}

export async function exportChapterToDocx(chapter) {
  const doc = new Document({
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

  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${safeFileName(book.title)}.docx`)
}
