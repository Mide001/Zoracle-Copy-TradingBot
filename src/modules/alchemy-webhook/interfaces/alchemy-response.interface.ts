export interface AlchemyWebhookResponse {
    data: {
        id: string;
        network: string;
        webhook_type: string;
        webhook_url: string;
        is_active: boolean;
        addresses: string[];
    };
}