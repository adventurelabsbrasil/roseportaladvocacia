export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      channels: {
        Row: {
          id: string;
          name: string;
          enabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          enabled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          enabled?: boolean;
          created_at?: string;
        };
      };
      campaigns: {
        Row: {
          id: string;
          channel_id: string;
          external_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          channel_id: string;
          external_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          channel_id?: string;
          external_id?: string;
          name?: string;
          created_at?: string;
        };
      };
      ads: {
        Row: {
          id: string;
          campaign_id: string;
          external_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          external_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          external_id?: string;
          name?: string;
          created_at?: string;
        };
      };
      daily_metrics: {
        Row: {
          id: string;
          channel_id: string;
          campaign_id: string;
          ad_id: string;
          date: string;
          impressions: number;
          link_clicks: number;
          spend_brl: number;
          leads: number;
          conversations_started: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          channel_id: string;
          campaign_id: string;
          ad_id: string;
          date: string;
          impressions?: number;
          link_clicks?: number;
          spend_brl?: number;
          leads?: number;
          conversations_started?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          channel_id?: string;
          campaign_id?: string;
          ad_id?: string;
          date?: string;
          impressions?: number;
          link_clicks?: number;
          spend_brl?: number;
          leads?: number;
          conversations_started?: number;
          created_at?: string;
        };
      };
    };
  };
}
