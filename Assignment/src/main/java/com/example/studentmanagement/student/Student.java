package com.example.studentmanagement.student;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "students")
public class Student {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, unique = true, length = 254)
    private String email;

    @Column(nullable = false, length = 120)
    private String course;

    @Column(nullable = false)
    private Integer age;

    protected Student() {
    }

    public Student(String name, String email, String course, Integer age) {
        this.name = name;
        this.email = email;
        this.course = course;
        this.age = age;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getCourse() { return course; }
    public Integer getAge() { return age; }

    public void update(String name, String email, String course, Integer age) {
        this.name = name;
        this.email = email;
        this.course = course;
        this.age = age;
    }
}
