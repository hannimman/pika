// Splits the FolioMD manual into hero bits + numbered "## N. title" sections.
// The manual's own title, 목차 list, and --- separators are dropped: the page renders those itself.
export type Section = { num: number; title: string; body: string }

// astryx only renders top-level ``` fences as CodeBlock (with a copy button); fences indented
// under a list item fall back to inline code. Dedent them — ordered lists keep their start
// number, so "3." after the block still reads 3.
export const liftCodeFences = (md: string) =>
  md.replace(/^( +)(```[^\n]*\n[\s\S]*?^\1```)$/gm, (_, indent: string, block: string) =>
    block.replace(new RegExp(`^${indent}`, 'gm'), ''),
  )

export function parseManual(md: string) {
  const parts = liftCodeFences(md.replace(/\r\n/g, '\n')).split(/^## (\d+)\. (.+)$/m)
  const intro = parts[0]
  const tagline = intro
    .split('\n')
    .filter((l) => l.startsWith('>'))
    .map((l) => l.replace(/^>\s?/, ''))
    .join('\n')
  const img = intro.match(/!\[([^\]]*)\]\(([^)]+)\)/)
  const heroImage = img ? { alt: img[1], src: img[2] } : null

  const sections: Section[] = []
  for (let i = 1; i < parts.length; i += 3) {
    const body = parts[i + 2].trim().replace(/\n-{3,}$/, '').trim()
    sections.push({ num: Number(parts[i]), title: parts[i + 1].trim(), body })
  }
  return { tagline, heroImage, sections }
}
