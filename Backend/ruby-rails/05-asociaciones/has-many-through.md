# has_many :through

Relación many-to-many con **modelo intermedio**.

```ruby
class User < ApplicationRecord
  has_many :enrollments
  has_many :courses, through: :enrollments
end

class Enrollment < ApplicationRecord
  belongs_to :user
  belongs_to :course
  # Puede tener campos adicionales: grade, completed_at, etc.
end

class Course < ApplicationRecord
  has_many :enrollments
  has_many :users, through: :enrollments
end

# Uso
user.courses
course.users
user.enrollments.where(course: course).first.grade
```

**Ventaja vs has_and_belongs_to_many**: puedes agregar atributos al modelo intermedio.
