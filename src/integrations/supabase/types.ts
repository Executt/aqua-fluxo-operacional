export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      compliance_scores: {
        Row: {
          created_at: string
          entidade_id: string
          id: string
          infracoes_abertas: number
          mes: string
          metas_cumpridas: number
          metas_total: number
          score: number
          status: string
          tendencia: string
          ultima_auditoria: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          entidade_id: string
          id?: string
          infracoes_abertas?: number
          mes: string
          metas_cumpridas?: number
          metas_total?: number
          score?: number
          status?: string
          tendencia?: string
          ultima_auditoria?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          entidade_id?: string
          id?: string
          infracoes_abertas?: number
          mes?: string
          metas_cumpridas?: number
          metas_total?: number
          score?: number
          status?: string
          tendencia?: string
          ultima_auditoria?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_scores_entidade_id_fkey"
            columns: ["entidade_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
        ]
      }
      entidades: {
        Row: {
          area_atuacao: string
          cnpj: string
          created_at: string
          id: string
          nome: string
          status: string
          updated_at: string
        }
        Insert: {
          area_atuacao: string
          cnpj: string
          created_at?: string
          id?: string
          nome: string
          status?: string
          updated_at?: string
        }
        Update: {
          area_atuacao?: string
          cnpj?: string
          created_at?: string
          id?: string
          nome?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      etes: {
        Row: {
          cidade: string
          codigo: string
          created_at: string
          entidade_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          nome: string
          status: string
          uf: string
          updated_at: string
        }
        Insert: {
          cidade: string
          codigo: string
          created_at?: string
          entidade_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome: string
          status?: string
          uf: string
          updated_at?: string
        }
        Update: {
          cidade?: string
          codigo?: string
          created_at?: string
          entidade_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome?: string
          status?: string
          uf?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "etes_entidade_id_fkey"
            columns: ["entidade_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
        ]
      }
      infracoes: {
        Row: {
          codigo: string
          created_at: string
          data_ocorrencia: string
          descricao: string
          entidade_id: string
          gravidade: string
          id: string
          norma: string
          prazo: string
          status: string
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          data_ocorrencia?: string
          descricao: string
          entidade_id: string
          gravidade?: string
          id?: string
          norma: string
          prazo: string
          status?: string
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          data_ocorrencia?: string
          descricao?: string
          entidade_id?: string
          gravidade?: string
          id?: string
          norma?: string
          prazo?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "infracoes_entidade_id_fkey"
            columns: ["entidade_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
        ]
      }
      sensor_leituras: {
        Row: {
          created_at: string
          id: string
          sensor_id: string
          status: string
          valor: number
        }
        Insert: {
          created_at?: string
          id?: string
          sensor_id: string
          status?: string
          valor: number
        }
        Update: {
          created_at?: string
          id?: string
          sensor_id?: string
          status?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "sensor_leituras_sensor_id_fkey"
            columns: ["sensor_id"]
            isOneToOne: false
            referencedRelation: "sensores"
            referencedColumns: ["id"]
          },
        ]
      }
      sensores: {
        Row: {
          bateria: number
          codigo: string
          created_at: string
          ete_id: string
          id: string
          limite_legal: string
          sinal: string
          status: string
          tipo: string
          ultima_leitura: string | null
          unidade: string
          updated_at: string
        }
        Insert: {
          bateria?: number
          codigo: string
          created_at?: string
          ete_id: string
          id?: string
          limite_legal: string
          sinal?: string
          status?: string
          tipo: string
          ultima_leitura?: string | null
          unidade?: string
          updated_at?: string
        }
        Update: {
          bateria?: number
          codigo?: string
          created_at?: string
          ete_id?: string
          id?: string
          limite_legal?: string
          sinal?: string
          status?: string
          tipo?: string
          ultima_leitura?: string | null
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sensores_ete_id_fkey"
            columns: ["ete_id"]
            isOneToOne: false
            referencedRelation: "etes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
