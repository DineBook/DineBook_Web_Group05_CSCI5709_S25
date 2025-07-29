import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

// Initialize S3 client
const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "dinebook-uploads";

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
        // Generate unique filename to avoid conflicts
        const fileExtension = originalName.split('.').pop();
        const fileName = `${uuidv4()}.${fileExtension}`;

        // Determine folder based on mimetype
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
        const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;

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
