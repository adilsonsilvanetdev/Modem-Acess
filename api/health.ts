export default function handler(_req: any, res: any) {
  res.status(200).json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
}
