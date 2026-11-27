package com.phraiz.back.workspace.repository;

import com.phraiz.back.workspace.domain.WorkspaceItem;
import com.phraiz.back.workspace.domain.WorkspaceItemType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WorkspaceItemRepository extends JpaRepository<WorkspaceItem, Long> {
    List<WorkspaceItem> findByMemberIdOrderByCreatedAtDesc(String memberId);
    List<WorkspaceItem> findByMemberIdAndItemTypeOrderByCreatedAtDesc(String memberId, WorkspaceItemType itemType);
    List<WorkspaceItem> findByMemberIdAndFolderIdOrderByCreatedAtDesc(String memberId, Long folderId);
    List<WorkspaceItem> findByMemberIdAndFolderIdAndItemTypeOrderByCreatedAtDesc(
            String memberId, Long folderId, WorkspaceItemType itemType
    );
    Optional<WorkspaceItem> findByIdAndMemberId(Long id, String memberId);
    long countByFolderId(Long folderId);
    void deleteByFolderId(Long folderId);
}
