/**
 * 404 Not Found Page
 * Custom error page for non-existent routes
 */

import { ErrorPage } from "@/components/ui/error-page";

export default function NotFound() {
    return (
        <ErrorPage
            title="Page Not Found"
            message="The page you're looking for doesn't exist. It may have been moved or deleted."
            statusCode={404}
            icon="notfound"
            showHome
            showBack
        />
    );
}
