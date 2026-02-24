# Ejemplos Prácticos

```ruby
# Importar CSV
class ImportUsersService
  def call(file)
    CSV.foreach(file.path, headers: true) do |row|
      User.find_or_create_by(email: row['email']) do |user|
        user.name = row['name']
        user.age = row['age']
      end
    end
  end
end

# Generar reporte
class GenerateReportService
  def call(start_date, end_date)
    {
      total_sales: Order.where(created_at: start_date..end_date).sum(:total),
      new_users: User.where(created_at: start_date..end_date).count,
      top_products: Product.joins(:order_items).group(:id).order('SUM(quantity) DESC').limit(5)
    }
  end
end

# Integración con API externa
class StripePaymentService
  def charge(user, amount)
    Stripe::Charge.create(
      amount: (amount * 100).to_i,
      currency: 'usd',
      customer: user.stripe_customer_id
    )
  end
end
```
