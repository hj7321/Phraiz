package com.phraiz.back.workspace.repository;

import com.phraiz.back.workspace.domain.WorkspaceFolder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WorkspaceFolderRepository extends JpaRepository<WorkspaceFolder, Long> {
    List<WorkspaceFolder> findByMemberIdOrderByCreatedAtDesc(String memberId);
    Optional<WorkspaceFolder> findByIdAndMemberId(Long id, String memberId);
}
