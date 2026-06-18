# Delhi Governance Intelligence Platform — Unified Architecture

## Rebranding Notice

> This platform is **no longer a grievance portal**. It is the **Delhi Governance Intelligence Platform** — a command center for real-time civic operations intelligence.

## Unified Complaint Engine

All intake sources feed into a single, unified complaint processing pipeline. The `ComplaintSource` enum already supports:

```typescript
enum ComplaintSource {
  WEB = 'web',           // ✅ Implemented
  WHATSAPP = 'whatsapp', // ✅ Implemented (Phase A)
  SMS = 'sms',           // 🔮 Future
  HELPLINE = 'helpline', // 🔮 Future (IVR)
  SOCIAL_MEDIA = 'social_media', // 🔮 Future
  WALK_IN = 'walk_in',   // 🔮 Future
}
```

## Source Abstraction Layer

```mermaid
graph TB
  subgraph "Intake Sources"
    WEB[🌐 Website Portal]
    WA[📱 WhatsApp]
    IVR[📞 IVR Helpline]
    CPGRAMS[🏛️ CPGRAMS]
    MCD[🏢 MCD 311]
    SOCIAL[📢 Social Media]
  end

  subgraph "Source Adapters"
    WEB_ADAPT[Web Adapter]
    WA_ADAPT[WhatsApp Adapter<br>ConversationEngine]
    IVR_ADAPT[IVR Adapter<br>Twilio + Whisper]
    CPGRAMS_ADAPT[CPGRAMS Adapter<br>API Sync]
    MCD_ADAPT[MCD 311 Adapter<br>Data Import]
    SOCIAL_ADAPT[Social Adapter<br>Twitter/X API]
  end

  subgraph "Unified Engine"
    INGEST[Complaint Ingestion<br>ComplaintService.createComplaint]
    ROUTE[Auto-Router<br>Category → Department]
    CLUSTER[Clustering Engine<br>DBSCAN 50m]
    SLA[SLA Engine<br>Deadline Computation]
    CRITICAL[Critical Detection<br>Keyword Scanner]
  end

  subgraph "Operations Layer"
    KANBAN[Officer Kanban]
    DIRECTIVE[CM Directives]
    SCORE[Accountability Scores]
    ALERT[Real-time Alerts]
  end

  subgraph "Intelligence Layer"
    DASH[CM Command Center]
    HEAT[Geolocation Heatmaps]
    TREND[Trend Analytics]
    RANK[Officer Rankings]
    CLUSTERS[Master Incidents]
  end

  WEB --> WEB_ADAPT
  WA --> WA_ADAPT
  IVR --> IVR_ADAPT
  CPGRAMS --> CPGRAMS_ADAPT
  MCD --> MCD_ADAPT
  SOCIAL --> SOCIAL_ADAPT

  WEB_ADAPT --> INGEST
  WA_ADAPT --> INGEST
  IVR_ADAPT --> INGEST
  CPGRAMS_ADAPT --> INGEST
  MCD_ADAPT --> INGEST
  SOCIAL_ADAPT --> INGEST

  INGEST --> ROUTE
  INGEST --> CLUSTER
  INGEST --> SLA
  INGEST --> CRITICAL

  ROUTE --> KANBAN
  CRITICAL --> ALERT
  CLUSTER --> CLUSTERS

  KANBAN --> SCORE
  DIRECTIVE --> KANBAN

  SCORE --> RANK
  ALERT --> DASH
  CLUSTERS --> DASH
  KANBAN --> HEAT
  KANBAN --> TREND
```

## Future Source Integrations

### IVR Helpline (Phone Calls)
- **Technology**: Twilio Voice + OpenAI Whisper
- **Flow**: Citizen calls → IVR menu → Voice recording → Whisper transcription → `ComplaintService.createComplaint(source: HELPLINE)`
- **Env vars**: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `OPENAI_API_KEY`

### CPGRAMS Integration
- **Technology**: Government API gateway polling
- **Flow**: Scheduled sync job → Fetch new CPGRAMS entries → Map to internal schema → Create complaints
- **Deduplication**: Match by citizen phone + location + category within 24h window

### MCD 311 Integration
- **Technology**: CSV/API batch import
- **Flow**: Daily data dump → Parse → Map categories → Create complaints

### Social Media Monitoring
- **Technology**: Twitter/X API v2 + NLP classification
- **Flow**: Stream mentions of @DelhiGov → NLP classifies as grievance → Auto-create complaint → DM citizen for location/details

## Key Design Principles

1. **Single Schema**: All sources create the same `Complaint` document. No source-specific models.
2. **Source Tracking**: Every complaint records its `source` field for analytics.
3. **Adapter Pattern**: Each source has its own adapter module that normalizes input into the shared `CreateComplaintData` interface.
4. **Audit Trail**: Every interaction from every source is logged to `AuditLog`.
5. **Mock-First**: All external integrations operate in mock mode when credentials are absent.

## Platform Capabilities Matrix

| Capability | Web | WhatsApp | IVR | CPGRAMS | MCD 311 | Social |
|-----------|-----|----------|-----|---------|---------|--------|
| File Complaint | ✅ | ✅ | 🔮 | 🔮 | 🔮 | 🔮 |
| Track Complaint | ✅ | ✅ | 🔮 | — | — | — |
| Upload Evidence | ✅ | ✅ | — | — | — | — |
| GPS Lock | ✅ | ✅ | — | — | — | — |
| Status Updates | ✅ | ✅ | 🔮 | — | — | 🔮 |
| Citizen Veto | ✅ | 🔮 | — | — | — | — |
