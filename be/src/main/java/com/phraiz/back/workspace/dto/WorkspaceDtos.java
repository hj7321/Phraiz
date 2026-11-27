package com.phraiz.back.workspace.dto;

import com.phraiz.back.workspace.domain.WorkspaceFolder;
import com.phraiz.back.workspace.domain.WorkspaceItem;
import com.phraiz.back.workspace.domain.WorkspaceItemType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public final class WorkspaceDtos {

    private WorkspaceDtos() {}

    public record CreateFolderRequest(
            @NotBlank(message = "폴더 이름을 입력해 주세요.")
            @Size(max = 120, message = "폴더 이름은 120자 이내로 입력해 주세요.")
            String name
    ) {}

    public record SaveItemRequest(
            Long folderId,
            @NotNull(message = "작업물 유형을 지정해 주세요.")
            WorkspaceItemType itemType,
            @NotBlank(message = "제목을 입력해 주세요.")
            @Size(max = 200)
            String title,
            @NotBlank(message = "입력 내용이 비어 있습니다.")
            String inputPayload,
            @NotBlank(message = "결과 내용이 비어 있습니다.")
            String outputPayload,
            String modelUsed,
            Integer tokensUsed
    ) {}

    public record MoveItemRequest(Long targetFolderId) {}

    public record FolderResponse(
            Long id,
            String name,
            long itemCount,
            LocalDateTime createdAt
    ) {
        public static FolderResponse from(WorkspaceFolder folder, long itemCount) {
            return new FolderResponse(folder.getId(), folder.getName(), itemCount, folder.getCreatedAt());
        }
    }

    public record ItemResponse(
            Long id,
            Long folderId,
            WorkspaceItemType itemType,
            String title,
            String inputPayload,
            String outputPayload,
            String modelUsed,
            Integer tokensUsed,
            LocalDateTime createdAt
    ) {
        public static ItemResponse from(WorkspaceItem item) {
            return new ItemResponse(
                    item.getId(),
                    item.getFolder() != null ? item.getFolder().getId() : null,
                    item.getItemType(),
                    item.getTitle(),
                    item.getInputPayload(),
                    item.getOutputPayload(),
                    item.getModelUsed(),
                    item.getTokensUsed(),
                    item.getCreatedAt()
            );
        }
    }
}
