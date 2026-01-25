export interface UploadedFile {
    id: string;
    filename: string;
    size: number;
    source: string;
    owner?: string; // e.g. "Self", "Spouse"
    status: "processing" | "completed" | "failed";
    description: string;
    uploadDate: string;
}
