import { NextRequest, NextResponse } from 'next/server';

/**
 * Badge API - Generate SVG badges for README embeds
 *
 * Usage in README:
 * ![Vibe Score](https://bugrit.dev/api/badge/owner/repo)
 * [![Vibe Score](https://bugrit.dev/api/badge/owner/repo)](https://bugrit.dev/health/owner/repo)
 */

interface BadgeParams {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: BadgeParams
) {
  const { owner, repo } = await params;
  const searchParams = request.nextUrl.searchParams;

  // Get optional overrides from query params (for testing/preview)
  const scoreOverride = searchParams.get('score');
  const gradeOverride = searchParams.get('grade');

  // TODO: Fetch actual score from database
  // For now, use demo data or query params
  const score = scoreOverride ? parseInt(scoreOverride) : await getRepoScore(owner, repo);
  const grade = gradeOverride || scoreToGrade(score);

  // Generate SVG badge
  const svg = generateBadgeSvg(score, grade);

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
    },
  });
}

async function getRepoScore(owner: string, repo: string): Promise<number> {
  // TODO: Implement actual database lookup
  // For demo, return a score based on repo name hash
  const hash = simpleHash(`${owner}/${repo}`);
  return 60 + (hash % 40); // Score between 60-99
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function scoreToGrade(score: number): string {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 60) return 'D';
  return 'F';
}

function getGradeColor(grade: string): string {
  if (grade.startsWith('A')) return '#4ade80'; // Green
  if (grade.startsWith('B')) return '#a3e635'; // Lime
  if (grade.startsWith('C')) return '#facc15'; // Yellow
  if (grade === 'D') return '#fb923c'; // Orange
  return '#f87171'; // Red
}

function generateBadgeSvg(score: number, grade: string): string {
  const color = getGradeColor(grade);
  const labelWidth = 70;
  const valueWidth = 55;
  const totalWidth = labelWidth + valueWidth;
  const height = 20;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="Vibe Score: ${score}">
  <title>Vibe Score: ${score} (${grade})</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="${height}" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="${height}" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="${height}" fill="${color}"/>
    <rect width="${totalWidth}" height="${height}" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text aria-hidden="true" x="${labelWidth / 2}" y="14" fill="#010101" fill-opacity=".3">vibe score</text>
    <text x="${labelWidth / 2}" y="13" fill="#fff">vibe score</text>
    <text aria-hidden="true" x="${labelWidth + valueWidth / 2}" y="14" fill="#010101" fill-opacity=".3">${score}</text>
    <text x="${labelWidth + valueWidth / 2}" y="13" fill="#fff">${score}</text>
  </g>
</svg>`;
}
