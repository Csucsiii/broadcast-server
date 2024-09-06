import express from "express";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const app = express();
app.use(express.json());

let isPlaying = false;
let startTime: number | null = null;

const videoPath = path.join(__dirname, "movie", "video.mp4");
console.log(videoPath);

let videoDuration = 0;

ffmpeg.ffprobe(videoPath, (err, metadata) => {
    if (err){
        console.log(`Error getting video metadata`, err);
    }else{
        videoDuration = metadata.format.duration as number * 1000;
    }
});

app.post("/play", (req, res) => {
    if (!isPlaying){
        isPlaying = true;
        startTime = Date.now();
        console.log("Video started");
        res.status(200).send({ message: "Video has started" });
    }else{
        res.status(400).send({ message: "Video is already playing" });
    }
});


app.post("/pause", (req, res) => {
    if (isPlaying){
        isPlaying = false;
        if (startTime){
            const elapsed = Date.now() - startTime;
            startTime = videoDuration - elapsed;
        }

        console.log("Video paused");

        res.status(200).send({ message: "Video paused" });
    }else{
        res.status(400).send({ message: "Video is already paused" });
    }
});


app.get("/video", (req, res) => {
    if (!startTime){
        return res.status(400).send({ message: "Video has not started yet" });
    }

    let elapsed = isPlaying ? Date.now() - startTime: videoDuration - startTime;

    if (elapsed >= videoDuration){
        elapsed = videoDuration;
    }

    const startSeconds = elapsed / 1000;

    ffmpeg(videoPath)
        .setStartTime(startSeconds)
        .outputOptions('-movflags +frag_keyframe+empty_moov')
        .outputOptions("-c:v copy")
        .outputOptions("-c:a copy")
        .format("mp4")
        .on("stderr", (stderrLine) => console.error("ffmpeg stderr:", stderrLine))
        .on("end", () => console.log("Stream ended"))
        .on("error", (err) => {
            console.error("Error during streaming", err);
            // res.sendStatus(500);
        })
        .pipe(res, { end: true });
});

const PORT = 3000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));