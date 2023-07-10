import { notFound } from "next/navigation";

export default function ForceDynamicNotFound() {
    return notFound();
}

export const dynamic = "force-dynamic";