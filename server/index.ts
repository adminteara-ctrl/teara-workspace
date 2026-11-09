import app from './app.ts';

const PORT = Number(process.env.API_PORT || 4000);

app.listen(PORT, () => {
    console.log(`Teara WorkHub API running on port ${PORT}`);
});
