# Wavelength - Riverside clone

Record remote conversation with studio quality!

Guests join via WebRTC, high-quality local recording, chunks upload to cloud in real-time, and also added the feature to merge them using FFmpeg in real time for the final video. Was a fun build!



Watch Live Preview here - https://x.com/sarthaksharma85/status/1937744926353093063

![Image](https://github.com/user-attachments/assets/34921506-c451-485b-94fc-2e8ff890c674)

## Run Locally

Clone the project

```bash
git clone https://github.com/sarthaksharma27/Wavelength.git
```

```bash
 cd wavelength
 ```
 Create a .env file and paste this configuration

 ```bash
DATABASE_URL="your_postgres_database_url"
SECRET_KEY=your_secret_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
REDIS_HOST=redis
REDIS_PORT=6379
```
Build the Docker image

```bash
 docker compose build
 ```

Start the application

```bash
docker compose up
```

The application will start on port 4000

