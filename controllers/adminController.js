import User from '../models/User.js'
import Booking from '../models/Booking.js'

export const getAdminStats = async (req, res) => {
  try {
    // 1️⃣ Дати для фільтрів
    const now = new Date()
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    )
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(now.getDate() - 6)

    // 2️⃣ Користувачі
    const totalUsers = await User.countDocuments()
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: startOfToday },
    })

    // 3️⃣ Замовлення
    const totalBookings = await Booking.countDocuments()

    // 3a. Статуси бронювань
    const bookingsStatusArray = await Booking.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])
    // Перетворюємо в обʼєкт { pending: X, confirmed: Y, canceled: Z }
    const bookingsStatus = { pending: 0, confirmed: 0, canceled: 0 }
    bookingsStatusArray.forEach((b) => {
      bookingsStatus[b._id] = b.count
    })

    // 3b. Бронювання за останні 7 днів
    const bookingsPerDay = await Booking.aggregate([
      { $match: { date: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])

    // 4️⃣ Популярні послуги (топ 3)
    const topServices = await Booking.aggregate([
      { $group: { _id: '$service', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 },
    ])

    // 5️⃣ Фінанси (якщо у Booking є поле price)
    const revenueTotal = await Booking.aggregate([
      { $group: { _id: null, total: { $sum: '$price' } } },
    ])
    const revenueToday = await Booking.aggregate([
      { $match: { createdAt: { $gte: startOfToday } } },
      { $group: { _id: null, total: { $sum: '$price' } } },
    ])
    const revenueMonth = await Booking.aggregate([
      { $match: { createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$price' } } },
    ])
    const revenue = {
      total: revenueTotal[0]?.total || 0,
      today: revenueToday[0]?.total || 0,
      thisMonth: revenueMonth[0]?.total || 0,
    }

    // 6️⃣ Повертаємо результат
    res.status(200).json({
      totalUsers,
      newUsersToday,
      totalBookings,
      bookingsStatus,
      bookingsPerDay,
      topServices,
      revenue,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to fetch admin stats' })
  }
}
