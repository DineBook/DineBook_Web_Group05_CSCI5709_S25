import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "dinebook-uploads";
const REGION = process.env.AWS_REGION || "us-east-1";

const createS3Client = () => {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        throw new Error("AWS credentials are not set in environment variables");
    }
    return new S3Client({
        region: REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
    });
};

/**
 * Upload a file to S3 and return the URL
 * @param buffer - File buffer
 * @param originalName - Original filename
 * @param mimetype - File MIME type
 * @returns Promise<string> - The S3 URL of the uploaded file
 */
export const uploadFileToS3 = async (
    buffer: Buffer,
    originalName: string,
    mimetype: string
): Promise<string> => {
    try {
        const s3Client = createS3Client();

        const fileExtension = originalName.split('.').pop();
        const fileName = `${uuidv4()}.${fileExtension}`;

        let folder = "misc";
        if (mimetype.startsWith("image/")) {
            folder = "images";
        } else if (mimetype.startsWith("video/")) {
            folder = "videos";
        } else if (mimetype.startsWith("application/pdf")) {
            folder = "documents";
        }

        const key = `${folder}/${fileName}`;

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: mimetype,
            // Make the object publicly readable
            ACL: "public-read",
        });

        await s3Client.send(command);

        // Return the public URL
        const url = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${key}`;

        return url;
    } catch (error) {
        console.error("Error uploading file to S3:", error);
        throw new Error(`Failed to upload file to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

/**
 * Upload multiple files to S3
 * @param files - Array of file objects with buffer, originalname, and mimetype
 * @returns Promise<string[]> - Array of S3 URLs
 */
export const uploadMultipleFilesToS3 = async (
    files: Array<{ buffer: Buffer; originalname: string; mimetype: string }>
): Promise<string[]> => {
    try {
        const uploadPromises = files.map(file =>
            uploadFileToS3(file.buffer, file.originalname, file.mimetype)
        );

        return await Promise.all(uploadPromises);
    } catch (error) {
        console.error("Error uploading multiple files to S3:", error);
        throw new Error(`Failed to upload files to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};
