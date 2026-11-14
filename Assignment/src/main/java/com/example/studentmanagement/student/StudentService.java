package com.example.studentmanagement.student;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class StudentService {
    private final StudentRepository repository;

    public StudentService(StudentRepository repository) {
        this.repository = repository;
    }

    public StudentResponse create(StudentRequest request) {
        return StudentResponse.from(repository.save(new Student(
                request.name().trim(), request.email().trim().toLowerCase(),
                request.course().trim(), request.age())));
    }

    @Transactional(readOnly = true)
    public List<StudentResponse> findAll() {
        return repository.findAll().stream().map(StudentResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public StudentResponse findById(Long id) {
        return StudentResponse.from(getStudent(id));
    }

    public StudentResponse update(Long id, StudentRequest request) {
        Student student = getStudent(id);
        student.update(request.name().trim(), request.email().trim().toLowerCase(),
                request.course().trim(), request.age());
        return StudentResponse.from(repository.save(student));
    }

    public void delete(Long id) {
        repository.delete(getStudent(id));
    }

    @Transactional(readOnly = true)
    public List<StudentResponse> findByCourse(String course) {
        return repository.findByCourseIgnoreCase(course.trim()).stream()
                .map(StudentResponse::from).toList();
    }

    private Student getStudent(Long id) {
        return repository.findById(id).orElseThrow(() -> new StudentNotFoundException(id));
    }
}

class StudentNotFoundException extends RuntimeException {
    StudentNotFoundException(Long id) {
        super("Student with id " + id + " was not found");
    }
}

class DuplicateStudentEmailException extends RuntimeException {
    DuplicateStudentEmailException() {
        super("A student with this email address already exists");
    }
}
