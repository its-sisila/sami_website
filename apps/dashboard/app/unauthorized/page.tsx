"use client";

/**
 * Unauthorized/Forbidden Page
 * Displays when user lacks permission for an action
 */

import { ErrorPage } from "@/components/ui/error-page";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Unauthorized() {
    const router = useRouter();
    const { signOut } = useAuth();

    const handleLogout = async () => {
        await signOut();
        router.push("/login");
    };

    return (
        <ErrorPage
            title="Access Denied"
            message="You don't have permission to access this resource. Please contact your administrator if you believe this is an error."
            statusCode={403}
            icon="forbidden"
            showRetry={false}
            showHome
        />
    );
}
