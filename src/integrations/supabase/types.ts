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
      analytics_guardrail_log: {
        Row: {
          created_at: string
          id: string
          metric: string
          outcome: string
          reason_code: string | null
          reason_msg: string | null
          requested_controls: Json | null
          stratify_by: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metric: string
          outcome: string
          reason_code?: string | null
          reason_msg?: string | null
          requested_controls?: Json | null
          stratify_by?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metric?: string
          outcome?: string
          reason_code?: string | null
          reason_msg?: string | null
          requested_controls?: Json | null
          stratify_by?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
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
      dim_maturidade_municipal: {
        Row: {
          atualizado_em: string
          estrato_dmi: Database["public"]["Enums"]["estrato_dmi"]
          fonte: string | null
          idh_m: number | null
          municipio_ibge: string
          municipio_nome: string
          pop_estimada: number | null
          receita_corrente_pc: number | null
          score_dmi: number | null
          servidores_reg_local: number | null
          snis_completude_pct: number | null
          uf: string
        }
        Insert: {
          atualizado_em?: string
          estrato_dmi?: Database["public"]["Enums"]["estrato_dmi"]
          fonte?: string | null
          idh_m?: number | null
          municipio_ibge: string
          municipio_nome: string
          pop_estimada?: number | null
          receita_corrente_pc?: number | null
          score_dmi?: number | null
          servidores_reg_local?: number | null
          snis_completude_pct?: number | null
          uf: string
        }
        Update: {
          atualizado_em?: string
          estrato_dmi?: Database["public"]["Enums"]["estrato_dmi"]
          fonte?: string | null
          idh_m?: number | null
          municipio_ibge?: string
          municipio_nome?: string
          pop_estimada?: number | null
          receita_corrente_pc?: number | null
          score_dmi?: number | null
          servidores_reg_local?: number | null
          snis_completude_pct?: number | null
          uf?: string
        }
        Relationships: []
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
      etes_curadoria: {
        Row: {
          ano_inicio_operacao: number | null
          codigo: string
          created_at: string
          eficiencia_dbo_pct: number | null
          faixa_dbo: Database["public"]["Enums"]["faixa_eficiencia_dbo"] | null
          id: string
          latitude: number | null
          longitude: number | null
          municipio_ibge: string
          municipio_nome: string
          nome: string
          observacoes: string | null
          operador_id: string
          populacao_atendida: number | null
          status_operacional: Database["public"]["Enums"]["status_operacional"]
          tipologia_id: string | null
          uf: string
          updated_at: string
          vazao_atual_lps: number | null
          vazao_projeto_lps: number | null
        }
        Insert: {
          ano_inicio_operacao?: number | null
          codigo: string
          created_at?: string
          eficiencia_dbo_pct?: number | null
          faixa_dbo?: Database["public"]["Enums"]["faixa_eficiencia_dbo"] | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          municipio_ibge: string
          municipio_nome: string
          nome: string
          observacoes?: string | null
          operador_id: string
          populacao_atendida?: number | null
          status_operacional?: Database["public"]["Enums"]["status_operacional"]
          tipologia_id?: string | null
          uf: string
          updated_at?: string
          vazao_atual_lps?: number | null
          vazao_projeto_lps?: number | null
        }
        Update: {
          ano_inicio_operacao?: number | null
          codigo?: string
          created_at?: string
          eficiencia_dbo_pct?: number | null
          faixa_dbo?: Database["public"]["Enums"]["faixa_eficiencia_dbo"] | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          municipio_ibge?: string
          municipio_nome?: string
          nome?: string
          observacoes?: string | null
          operador_id?: string
          populacao_atendida?: number | null
          status_operacional?: Database["public"]["Enums"]["status_operacional"]
          tipologia_id?: string | null
          uf?: string
          updated_at?: string
          vazao_atual_lps?: number | null
          vazao_projeto_lps?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "etes_curadoria_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "dim_operador"
            referencedColumns: ["operador_id"]
          },
          {
            foreignKeyName: "etes_curadoria_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "operadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etes_curadoria_tipologia_id_fkey"
            columns: ["tipologia_id"]
            isOneToOne: false
            referencedRelation: "dim_tipologia"
            referencedColumns: ["tipologia_id"]
          },
          {
            foreignKeyName: "etes_curadoria_tipologia_id_fkey"
            columns: ["tipologia_id"]
            isOneToOne: false
            referencedRelation: "tipologias_tratamento"
            referencedColumns: ["id"]
          },
        ]
      }
      formulario_respostas: {
        Row: {
          ano_referencia: number
          created_at: string
          estado: Database["public"]["Enums"]["estado_resposta"]
          ete_id: string
          id: string
          mes_referencia: number
          motivo_rejeicao: string | null
          operador_id: string
          payload: Json
          payload_sha256: string | null
          reviewed_at: string | null
          submitted_at: string | null
          updated_at: string
          updated_by: string | null
          user_revisor: string | null
          user_submitter: string | null
        }
        Insert: {
          ano_referencia: number
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_resposta"]
          ete_id: string
          id?: string
          mes_referencia: number
          motivo_rejeicao?: string | null
          operador_id: string
          payload?: Json
          payload_sha256?: string | null
          reviewed_at?: string | null
          submitted_at?: string | null
          updated_at?: string
          updated_by?: string | null
          user_revisor?: string | null
          user_submitter?: string | null
        }
        Update: {
          ano_referencia?: number
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_resposta"]
          ete_id?: string
          id?: string
          mes_referencia?: number
          motivo_rejeicao?: string | null
          operador_id?: string
          payload?: Json
          payload_sha256?: string | null
          reviewed_at?: string | null
          submitted_at?: string | null
          updated_at?: string
          updated_by?: string | null
          user_revisor?: string | null
          user_submitter?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "formulario_respostas_ete_id_fkey"
            columns: ["ete_id"]
            isOneToOne: false
            referencedRelation: "etes_curadoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formulario_respostas_ete_id_fkey"
            columns: ["ete_id"]
            isOneToOne: false
            referencedRelation: "fato_etes_curadoria"
            referencedColumns: ["ete_id"]
          },
          {
            foreignKeyName: "formulario_respostas_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "dim_operador"
            referencedColumns: ["operador_id"]
          },
          {
            foreignKeyName: "formulario_respostas_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "operadores"
            referencedColumns: ["id"]
          },
        ]
      }
      formulario_respostas_audit: {
        Row: {
          ano: number | null
          changed_at: string
          changed_by: string | null
          estado_anterior: string | null
          estado_novo: string | null
          ete_id: string | null
          id: string
          mes: number | null
          motivo_rejeicao: string | null
          operacao: string
          operador_id: string | null
          payload_anterior: Json | null
          payload_novo: Json | null
          resposta_id: string
        }
        Insert: {
          ano?: number | null
          changed_at?: string
          changed_by?: string | null
          estado_anterior?: string | null
          estado_novo?: string | null
          ete_id?: string | null
          id?: string
          mes?: number | null
          motivo_rejeicao?: string | null
          operacao: string
          operador_id?: string | null
          payload_anterior?: Json | null
          payload_novo?: Json | null
          resposta_id: string
        }
        Update: {
          ano?: number | null
          changed_at?: string
          changed_by?: string | null
          estado_anterior?: string | null
          estado_novo?: string | null
          ete_id?: string | null
          id?: string
          mes?: number | null
          motivo_rejeicao?: string | null
          operacao?: string
          operador_id?: string | null
          payload_anterior?: Json | null
          payload_novo?: Json | null
          resposta_id?: string
        }
        Relationships: []
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
      knowledge_base: {
        Row: {
          active: boolean
          author_user_id: string | null
          category: string
          content: string
          created_at: string
          id: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          author_user_id?: string | null
          category?: string
          content?: string
          created_at?: string
          id?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          author_user_id?: string | null
          category?: string
          content?: string
          created_at?: string
          id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      llm_models: {
        Row: {
          active: boolean
          capabilities: string[] | null
          context_window: number | null
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_default: boolean
          model_id: string
          provider: string
          tier: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          capabilities?: string[] | null
          context_window?: number | null
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_default?: boolean
          model_id: string
          provider: string
          tier?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          capabilities?: string[] | null
          context_window?: number | null
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_default?: boolean
          model_id?: string
          provider?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      mcp_servers: {
        Row: {
          active: boolean
          auth_config: Json | null
          auth_type: string
          created_at: string
          description: string | null
          id: string
          name: string
          transport: string
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          auth_config?: Json | null
          auth_type?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          transport?: string
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          auth_config?: Json | null
          auth_type?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          transport?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      operador_municipios: {
        Row: {
          created_at: string
          id: string
          municipio_ibge: string
          municipio_nome: string
          operador_id: string
          uf: string
        }
        Insert: {
          created_at?: string
          id?: string
          municipio_ibge: string
          municipio_nome: string
          operador_id: string
          uf: string
        }
        Update: {
          created_at?: string
          id?: string
          municipio_ibge?: string
          municipio_nome?: string
          operador_id?: string
          uf?: string
        }
        Relationships: [
          {
            foreignKeyName: "operador_municipios_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "dim_operador"
            referencedColumns: ["operador_id"]
          },
          {
            foreignKeyName: "operador_municipios_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "operadores"
            referencedColumns: ["id"]
          },
        ]
      }
      operadores: {
        Row: {
          ativo: boolean
          cnpj: string
          created_at: string
          email_contato: string | null
          id: string
          nome_fantasia: string | null
          razao_social: string
          telefone: string | null
          tipo: Database["public"]["Enums"]["tipo_operador"]
          uf: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cnpj: string
          created_at?: string
          email_contato?: string | null
          id?: string
          nome_fantasia?: string | null
          razao_social: string
          telefone?: string | null
          tipo: Database["public"]["Enums"]["tipo_operador"]
          uf: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cnpj?: string
          created_at?: string
          email_contato?: string | null
          id?: string
          nome_fantasia?: string | null
          razao_social?: string
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["tipo_operador"]
          uf?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          created_at: string
          email: string
          id: string
          metabase_overdue_threshold_min: number
          nome: string
          operador_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email: string
          id?: string
          metabase_overdue_threshold_min?: number
          nome: string
          operador_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string
          id?: string
          metabase_overdue_threshold_min?: number
          nome?: string
          operador_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_operador_fk"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "dim_operador"
            referencedColumns: ["operador_id"]
          },
          {
            foreignKeyName: "profiles_operador_fk"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "operadores"
            referencedColumns: ["id"]
          },
        ]
      }
      sasb_datasets: {
        Row: {
          code: string
          created_at: string
          description: string | null
          dimension: string
          enabled: boolean
          endpoint: string
          id: string
          last_sync_at: string | null
          name: string
          quality_score: number | null
          records: number
          source_org: string
          status: string
          sync_interval_minutes: number
          updated_at: string
          used_in_score: boolean
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          dimension: string
          enabled?: boolean
          endpoint: string
          id?: string
          last_sync_at?: string | null
          name: string
          quality_score?: number | null
          records?: number
          source_org: string
          status?: string
          sync_interval_minutes?: number
          updated_at?: string
          used_in_score?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          dimension?: string
          enabled?: boolean
          endpoint?: string
          id?: string
          last_sync_at?: string | null
          name?: string
          quality_score?: number | null
          records?: number
          source_org?: string
          status?: string
          sync_interval_minutes?: number
          updated_at?: string
          used_in_score?: boolean
        }
        Relationships: []
      }
      sasb_sync_logs: {
        Row: {
          completeness_pct: number | null
          created_at: string
          dataset_id: string
          duration_ms: number | null
          finished_at: string | null
          freshness_days: number | null
          id: string
          message: string | null
          quality_score: number | null
          records_in: number | null
          records_invalid: number | null
          records_out: number | null
          started_at: string
          status: string
          triggered_by: string
          validity_pct: number | null
          warnings: Json | null
        }
        Insert: {
          completeness_pct?: number | null
          created_at?: string
          dataset_id: string
          duration_ms?: number | null
          finished_at?: string | null
          freshness_days?: number | null
          id?: string
          message?: string | null
          quality_score?: number | null
          records_in?: number | null
          records_invalid?: number | null
          records_out?: number | null
          started_at?: string
          status?: string
          triggered_by?: string
          validity_pct?: number | null
          warnings?: Json | null
        }
        Update: {
          completeness_pct?: number | null
          created_at?: string
          dataset_id?: string
          duration_ms?: number | null
          finished_at?: string | null
          freshness_days?: number | null
          id?: string
          message?: string | null
          quality_score?: number | null
          records_in?: number | null
          records_invalid?: number | null
          records_out?: number | null
          started_at?: string
          status?: string
          triggered_by?: string
          validity_pct?: number | null
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "sasb_sync_logs_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "sasb_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      sensitive_access_log: {
        Row: {
          action: string
          created_at: string
          filters: Json | null
          id: string
          ip: unknown
          resource: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          filters?: Json | null
          id?: string
          ip?: unknown
          resource: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          filters?: Json | null
          id?: string
          ip?: unknown
          resource?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      system_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      tipologias_tratamento: {
        Row: {
          ativo: boolean
          categoria: string
          codigo: string
          descricao: string | null
          eficiencia_dbo_tipica_max: number | null
          eficiencia_dbo_tipica_min: number | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          categoria: string
          codigo: string
          descricao?: string | null
          eficiencia_dbo_tipica_max?: number | null
          eficiencia_dbo_tipica_min?: number | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          codigo?: string
          descricao?: string | null
          eficiencia_dbo_tipica_max?: number | null
          eficiencia_dbo_tipica_min?: number | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      dim_municipio: {
        Row: {
          municipio_ibge: string | null
          municipio_nome: string | null
          uf: string | null
        }
        Relationships: []
      }
      dim_operador: {
        Row: {
          cnpj: string | null
          operador_id: string | null
          razao_social: string | null
          tipo: Database["public"]["Enums"]["tipo_operador"] | null
          uf: string | null
        }
        Relationships: []
      }
      dim_tipologia: {
        Row: {
          categoria: string | null
          codigo: string | null
          nome: string | null
          tipologia_id: string | null
        }
        Relationships: []
      }
      fato_etes_curadoria: {
        Row: {
          eficiencia_dbo_pct: number | null
          ete_id: string | null
          faixa_dbo: Database["public"]["Enums"]["faixa_eficiencia_dbo"] | null
          municipio_ibge: string | null
          operador_id: string | null
          pct_utilizacao: number | null
          populacao_atendida: number | null
          status_operacional:
            | Database["public"]["Enums"]["status_operacional"]
            | null
          tipologia_id: string | null
          uf: string | null
          vazao_atual_lps: number | null
          vazao_projeto_lps: number | null
        }
        Relationships: [
          {
            foreignKeyName: "etes_curadoria_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "dim_operador"
            referencedColumns: ["operador_id"]
          },
          {
            foreignKeyName: "etes_curadoria_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "operadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etes_curadoria_tipologia_id_fkey"
            columns: ["tipologia_id"]
            isOneToOne: false
            referencedRelation: "dim_tipologia"
            referencedColumns: ["tipologia_id"]
          },
          {
            foreignKeyName: "etes_curadoria_tipologia_id_fkey"
            columns: ["tipologia_id"]
            isOneToOne: false
            referencedRelation: "tipologias_tratamento"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_cobertura_municipal: {
        Row: {
          eficiencia_media_dbo: number | null
          estrato_dmi: Database["public"]["Enums"]["estrato_dmi"] | null
          municipio_ibge: string | null
          pop_atendida: number | null
          qt_ativas: number | null
          qt_etes: number | null
          snis_completude_pct: number | null
          uf: string | null
        }
        Relationships: []
      }
      mv_dbo_regional: {
        Row: {
          eficiencia_media_dbo: number | null
          estrato_dmi: Database["public"]["Enums"]["estrato_dmi"] | null
          qt_alta: number | null
          qt_baixa: number | null
          qt_etes: number | null
          qt_normal: number | null
          regiao: string | null
          uf: string | null
        }
        Relationships: []
      }
      mv_etes_por_tipologia: {
        Row: {
          categoria: string | null
          codigo: string | null
          eficiencia_media_dbo: number | null
          nome: string | null
          qt_etes: number | null
          uf: string | null
        }
        Relationships: []
      }
      mv_saude_vs_saneamento_por_estrato: {
        Row: {
          completude_media: number | null
          eficiencia_media_dbo: number | null
          estrato_dmi: Database["public"]["Enums"]["estrato_dmi"] | null
          incidencia_doencas_hidricas_100k: number | null
          internacoes_dia_100k: number | null
          pop_atendida: number | null
          qt_etes: number | null
          qt_municipios: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_metabase_refresh_status: { Args: never; Returns: Json }
      get_user_operador: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      refresh_metabase_views: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "gestor" | "auditor" | "operador"
      estado_resposta:
        | "rascunho"
        | "submetido"
        | "em_analise"
        | "validado"
        | "rejeitado"
      estrato_dmi: "A" | "B" | "C" | "D" | "E"
      faixa_eficiencia_dbo: "baixa" | "normal" | "alta"
      status_operacional:
        | "ativa"
        | "em_construcao_ampliacao"
        | "inativa_desativada"
        | "planejada"
      tipo_operador:
        | "estadual"
        | "regional"
        | "municipal"
        | "privado"
        | "autarquia"
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
    Enums: {
      app_role: ["admin", "gestor", "auditor", "operador"],
      estado_resposta: [
        "rascunho",
        "submetido",
        "em_analise",
        "validado",
        "rejeitado",
      ],
      estrato_dmi: ["A", "B", "C", "D", "E"],
      faixa_eficiencia_dbo: ["baixa", "normal", "alta"],
      status_operacional: [
        "ativa",
        "em_construcao_ampliacao",
        "inativa_desativada",
        "planejada",
      ],
      tipo_operador: [
        "estadual",
        "regional",
        "municipal",
        "privado",
        "autarquia",
      ],
    },
  },
} as const
