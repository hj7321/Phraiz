package com.phraiz.back.workspace.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 기존 3중 복제 테이블(paraphrase_*, summary_*, cite_*)을 하나로 통합한 작업물 엔티티.
 */
@Entity
@Table(
        name = "workspace_items",
        indexes = {
                @Index(name = "idx_workspace_items_member_type", columnList = "member_id, item_type"),
                @Index(name = "idx_workspace_items_folder", columnList = "folder_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkspaceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "folder_id")
    private WorkspaceFolder folder;

    @Column(name = "member_id", nullable = false, length = 100)
    private String memberId;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false, length = 20)
    private WorkspaceItemType itemType;

    @Column(nullable = false, length = 200)
    private String title;

    @Lob
    @Column(name = "input_payload", nullable = false, columnDefinition = "LONGTEXT")
    private String inputPayload;

    @Lob
    @Column(name = "output_payload", nullable = false, columnDefinition = "LONGTEXT")
    private String outputPayload;

    @Column(name = "model_used", length = 100)
    private String modelUsed;

    @Column(name = "tokens_used")
    private Integer tokensUsed;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public WorkspaceItem(
            WorkspaceFolder folder,
            String memberId,
            WorkspaceItemType itemType,
            String title,
            String inputPayload,
            String outputPayload,
            String modelUsed,
            Integer tokensUsed
    ) {
        this.folder = folder;
        this.memberId = memberId;
        this.itemType = itemType;
        this.title = title;
        this.inputPayload = inputPayload;
        this.outputPayload = outputPayload;
        this.modelUsed = modelUsed;
        this.tokensUsed = tokensUsed;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public void moveToFolder(WorkspaceFolder targetFolder) {
        this.folder = targetFolder;
        this.updatedAt = LocalDateTime.now();
    }
}
